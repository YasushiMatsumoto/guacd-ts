/**
 * Main entry point — the Guacamole WebSocket ↔ guacd bridge server.
 *
 * @packageDocumentation
 */

import { EventEmitter } from 'events';
import * as http from 'http';
import * as url from 'url';
import * as WebSocket from 'ws';
import type {
  ConnectionContext,
  ConnectionSettings,
  DefaultConnectionSettings,
  GuacamoleServerOptions,
  GuacdOptions,
  IssuedTicket,
  IssueTicketOptions,
  TicketData,
} from '../types';
import type { ILogger } from '../logging/logger';
import { createDefaultLogger } from '../logging/logger';
import { TicketManager } from './ticket-manager';
import { ClientConnection } from './client-connection';
import { AuthenticationError } from '../errors';

/**
 * Manages the lifecycle of WebSocket connections proxied to a guacd daemon.
 *
 * Unlike the previous `GuacdServer`, this class does **not** create a
 * `WebSocket.Server` internally.  Instead it exposes:
 *
 * - {@link handleUpgrade} — for manual integration with any HTTP server.
 * - {@link attach} — a convenience helper that listens on a given path.
 *
 * @example
 * ```ts
 * import http from 'http';
 * import { GuacamoleServer } from 'guacd-ts';
 *
 * const httpServer = http.createServer();
 * const guac = new GuacamoleServer({ guacd: { host: '127.0.0.1' } });
 * guac.attach(httpServer, '/guacamole');
 *
 * httpServer.listen(3000);
 * ```
 */
export class GuacamoleServer extends EventEmitter {
  private readonly logger: ILogger;
  private readonly ticketManager: TicketManager;
  private readonly wss: WebSocket.Server;
  private readonly defaultGuacdOptions: GuacdOptions;
  private readonly connectionDefaultSettings: DefaultConnectionSettings;
  private readonly maxInactivityTime: number;

  private activeConnections = new Map<number, ClientConnection>();
  private connectionCounter = 0;

  constructor(private readonly options: GuacamoleServerOptions = {}) {
    super();

    // Logger -- use supplied or create a default.
    this.logger = options.logger ?? createDefaultLogger(options.log);

    // Ticket manager.
    this.ticketManager = new TicketManager({
      store: options.ticketStore,
      defaultTicketTtlMs: options.defaultTicketTtlMs,
      defaultConnectionTtlMs: options.defaultConnectionTtlMs,
    });

    // guacd defaults.
    this.defaultGuacdOptions = {
      host: options.guacd?.host ?? '127.0.0.1',
      port: options.guacd?.port ?? 4822,
    };

    // Per-protocol default settings.
    this.connectionDefaultSettings = {
      rdp: {
        port: 3389,
        width: 1024,
        height: 768,
        dpi: 96,
        audio: ['audio/L16'],
        image: ['image/png', 'image/jpeg'],
      },
      vnc: { port: 5900, width: 1024, height: 768, dpi: 96 },
      ssh: { port: 22, 'font-name': 'monospace', 'font-size': 12 },
      telnet: { port: 23, 'font-name': 'monospace', 'font-size': 12 },
      ...options.connectionDefaultSettings,
    };

    this.maxInactivityTime = options.maxInactivityTime ?? 0;

    // Internal WebSocket.Server — noServer mode (no HTTP server bound).
    this.wss = new WebSocket.Server({ noServer: true });

    this.logger.info('GuacamoleServer initialised');
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Issue a ticket that a WebSocket client can later consume.
   *
   * @param connectionSettings - Protocol settings forwarded to guacd.
   * @param options            - Per-ticket TTL / guacd overrides.
   */
  async issueTicket(
    connectionSettings: ConnectionSettings,
    options?: IssueTicketOptions
  ): Promise<IssuedTicket> {
    return this.ticketManager.issueTicket(connectionSettings, options);
  }

  /**
   * Revoke (delete) a previously issued ticket.
   */
  async revokeTicket(ticketId: string): Promise<void> {
    return this.ticketManager.revokeTicket(ticketId);
  }

  /**
   * Convenience method — attach to an HTTP server and optionally filter by
   * URL path.
   *
   * @param httpServer - An `http.Server` (e.g. from Express / Fastify).
   * @param path       - Only handle upgrades whose URL starts with this
   *                     path.  If omitted all upgrade requests are handled.
   */
  attach(httpServer: http.Server, path?: string): void {
    httpServer.on('upgrade', (request, socket, head) => {
      const reqPath = url.parse(request.url ?? '').pathname ?? '/';
      if (path && !reqPath.startsWith(path)) return;
      this.handleUpgrade(request, socket as import('net').Socket, head);
    });
  }

  /**
   * Manually handle an HTTP upgrade request.
   *
   * Call this from your own `upgrade` event handler when you need
   * path-based routing or other custom logic.
   */
  handleUpgrade(request: http.IncomingMessage, socket: import('net').Socket, head: Buffer): void {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      void this.handleNewConnection(ws, request);
    });
  }

  /** Number of currently active tunnels. */
  getActiveConnections(): number {
    return this.activeConnections.size;
  }

  /**
   * Gracefully shut down all tunnels and the internal WebSocket.Server.
   */
  async close(): Promise<void> {
    this.logger.info('Shutting down GuacamoleServer', {
      active: this.activeConnections.size,
    });

    for (const conn of this.activeConnections.values()) {
      conn.close();
    }
    this.activeConnections.clear();

    return new Promise((resolve) => {
      this.wss.close(() => {
        this.logger.info('GuacamoleServer closed');
        resolve();
      });
    });
  }

  // -----------------------------------------------------------------------
  // Connection handling
  // -----------------------------------------------------------------------

  private async handleNewConnection(
    ws: WebSocket.WebSocket,
    request: http.IncomingMessage
  ): Promise<void> {
    this.connectionCounter++;
    const connectionId = this.connectionCounter;

    try {
      // 1. Extract ticket ID from the URL query string.
      const parsedUrl = url.parse(request.url ?? '', true);
      const query = parsedUrl.query as Record<string, string>;
      const ticketId = query.ticket ?? query.ticketId ?? query.token;

      if (!ticketId) {
        this.logger.warn('Ticket ID missing in WebSocket request');
        ws.close(4401, 'Ticket ID required');
        return;
      }

      // 2. Validate & consume the ticket.
      let ticketData: TicketData;
      try {
        ticketData = await this.ticketManager.validateAndConsume(ticketId);
      } catch (err) {
        this.logger.warn('Ticket validation failed', {
          ticketId,
          error: (err as Error).message,
        });
        ws.close(4401, (err as Error).message);
        return;
      }

      const connectionSettings = ticketData.connectionSettings;

      // 3. Build ConnectionContext for hooks.
      const context: ConnectionContext = {
        ticketId,
        request,
        connectionSettings,
        query,
      };

      // 4. onBeforeConnect hook.
      if (this.options.hooks?.onBeforeConnect) {
        await this.options.hooks.onBeforeConnect(context);
      }

      // 5. onAuthenticate hook.
      if (this.options.hooks?.onAuthenticate) {
        const allowed = await this.options.hooks.onAuthenticate(context);
        if (!allowed) {
          throw new AuthenticationError('Authentication rejected by hook');
        }
      }

      // 6. Resolve guacd target.
      const guacdOptions: GuacdOptions = {
        host: ticketData.guacdOptions?.host ?? this.defaultGuacdOptions.host,
        port: ticketData.guacdOptions?.port ?? this.defaultGuacdOptions.port,
      };

      // 7. Merge per-protocol defaults into settings.
      const mergedSettings = this.mergeSettings(connectionSettings);

      // 8. Create the bridge.
      const clientConnection = new ClientConnection(
        connectionId,
        ticketId,
        ws,
        connectionSettings,
        this.logger,
        this.maxInactivityTime
      );

      // -- lifecycle wiring ------------------------------------------------

      clientConnection.on('ready', (conn: ClientConnection) => {
        this.logger.debug('Connection ready', {
          connectionId: conn.connectionId,
          guacamoleConnectionId: conn.guacamoleConnectionId,
        });
        this.options.hooks?.onConnect?.(conn);
        this.emit('open', conn);
      });

      clientConnection.on('close', (conn: ClientConnection, error?: Error) => {
        this.activeConnections.delete(conn.connectionId);
        const reason = error?.message;
        this.options.hooks?.onDisconnect?.(conn, reason);
        this.emit('close', conn, error);
      });

      clientConnection.on('error', (conn: ClientConnection, error: Error) => {
        this.options.hooks?.onError?.(conn, error);
        this.emit('error', conn, error);
      });

      // 9. Open the tunnel.
      clientConnection.connect(guacdOptions, mergedSettings, ticketData.connectionTtlMs);

      this.activeConnections.set(connectionId, clientConnection);
    } catch (error) {
      this.logger.error('Failed to establish connection', {
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1011, 'Internal server error');
      }
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Merge per-protocol defaults + user-supplied settings into one flat bag.
   */
  private mergeSettings(
    connectionSettings: ConnectionSettings
  ): Record<string, string | number | boolean | string[]> {
    const type = connectionSettings.type;
    const defaults =
      (
        this.connectionDefaultSettings as Record<
          string,
          Record<string, string | number | boolean | string[]> | undefined
        >
      )[type] ?? {};
    return { ...defaults, ...connectionSettings.settings };
  }
}
