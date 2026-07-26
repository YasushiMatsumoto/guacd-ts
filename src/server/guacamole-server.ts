/**
 * Main entry point — the Guacamole WebSocket ↔ guacd bridge server.
 *
 * @packageDocumentation
 */

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import * as http from 'http';
import * as net from 'net';
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
import { noopLogger } from '../logging/logger';
import { TicketManager } from './ticket-manager';
import { ClientConnection } from './client-connection';
import { AuthenticationError, ConnectionError } from '../errors';

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
  private readonly guacdInactivityTimeoutMs: number;
  private readonly connectTimeoutMs: number;
  private readonly maxConnections: number;
  private readonly maxJoinedPerSession: number;
  private readonly allowJoin: boolean;

  private activeConnections = new Map<string, ClientConnection>();
  private closed = false;

  constructor(private readonly options: GuacamoleServerOptions = {}) {
    super();

    // Logger -- use supplied or create a default.
    this.logger = options.logger ?? noopLogger;

    // Ticket manager.
    this.ticketManager = new TicketManager({
      store: options.ticketStore,
      defaultTicketTtlMs: options.defaultTicketTtlMs,
      defaultConnectionTtlMs: options.defaultConnectionTtlMs,
      logger: this.logger,
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
    this.guacdInactivityTimeoutMs = options.guacdInactivityTimeoutMs ?? 0;
    this.connectTimeoutMs = options.connectTimeoutMs ?? 10_000;
    this.maxConnections = options.maxConnections ?? 0;
    this.maxJoinedPerSession = options.maxJoinedPerSession ?? 5;
    this.allowJoin = options.allowJoin ?? false;

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
   * Issue a ticket to join an existing session (screen sharing).
   *
   * Looks up the connection by its server-assigned ID, validates that the
   * session allows joining, and returns a one-time ticket.
   *
   * @param connectionId - The server-assigned connection ID to join.
   * @param options      - Per-ticket TTL / guacd overrides.
   */
  async joinSession(
    connectionId: string,
    options?: IssueTicketOptions
  ): Promise<IssuedTicket> {
    const conn = this.activeConnections.get(connectionId);
    if (!conn || !conn.guacamoleConnectionId) {
      this.logger.warn('Join session failed: connection not available', { connectionId });
      throw new ConnectionError(`Connection ${connectionId} is not available`);
    }

    const joinAllowed = conn.connectionSettings.allowJoin ?? this.allowJoin;
    if (!joinAllowed) {
      this.logger.warn('Join session failed: sharing not allowed', { connectionId });
      throw new ConnectionError('Session sharing not allowed');
    }

    const ticket = await this.ticketManager.issueTicket(
      {
        type: conn.connectionSettings.type,
        join: conn.guacamoleConnectionId,
        settings: { 'read-only': 'true' },
      },
      options
    );
    this.logger.info('Join session ticket issued', { connectionId, ticketId: ticket.ticketId });
    return ticket;
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
    this.logger.debug('Attached to HTTP server', { path: path ?? '/' });
    httpServer.on('upgrade', (request, socket, head) => {
      const reqPath = new URL(request.url ?? '/', 'http://localhost').pathname;
      if (path && !reqPath.startsWith(path)) return;
      this.handleUpgrade(request, socket as import('net').Socket, head);
    });

    httpServer.on('close', () => {
      void this.close();
    });
  }

  /**
   * Manually handle an HTTP upgrade request.
   *
   * Call this from your own `upgrade` event handler when you need
   * path-based routing or other custom logic.
   */
  handleUpgrade(request: http.IncomingMessage, socket: import('net').Socket, head: Buffer): void {
    this.logger.verbose('WebSocket upgrade request', {
      path: new URL(request.url ?? '/', 'http://localhost').pathname,
    });
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      void this.handleNewConnection(ws, request);
    });
  }

  /** Number of currently active tunnels. */
  getActiveConnections(): number {
    return this.activeConnections.size;
  }

  /** Retrieve a specific connection by its ID, or `undefined` if not found. */
  getConnection(connectionId: string): ClientConnection | undefined {
    return this.activeConnections.get(connectionId);
  }

  /** Return all currently active connections. */
  getConnectionList(): ClientConnection[] {
    return Array.from(this.activeConnections.values());
  }

  /**
   * Force-disconnect a specific connection.
   *
   * @returns `true` if the connection existed and was closed, `false` if not found.
   */
  disconnectConnection(connectionId: string, reason?: string): boolean {
    const conn = this.activeConnections.get(connectionId);
    if (!conn) return false;
    this.logger.info('Connection force-disconnected', { connectionId, reason });
    conn.close(reason ? new Error(reason) : undefined);
    return true;
  }

  /**
   * Check whether the guacd daemon is reachable.
   *
   * Opens a TCP connection, waits for the handshake start, then
   * disconnects.  Useful for health-check endpoints.
   *
   * @param timeoutMs - How long to wait before giving up (default: 5 000 ms).
   * @returns `{ ok, latencyMs, error? }`
   */
  async checkGuacd(timeoutMs = 5_000): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const host = this.defaultGuacdOptions.host ?? '127.0.0.1';
    const port = this.defaultGuacdOptions.port ?? 4822;
    const start = Date.now();

    return new Promise((resolve) => {
      const socket = net.connect(port, host);
      let settled = false;

      const finish = (ok: boolean, error?: string): void => {
        if (settled) return;
        settled = true;
        socket.removeAllListeners();
        if (!socket.destroyed) {
          socket.end();
          socket.destroy();
        }
        resolve({ ok, latencyMs: Date.now() - start, error });
      };

      socket.setTimeout(timeoutMs);
      socket.on('connect', () => finish(true));
      socket.on('timeout', () => finish(false, `Timeout after ${String(timeoutMs)}ms`));
      socket.on('error', (err: Error & { code?: string }) => finish(false, err.message));
    });
  }

  /**
   * Gracefully shut down all tunnels and the internal WebSocket.Server.
   */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    this.logger.info('Shutting down GuacamoleServer', {
      active: this.activeConnections.size,
    });

    const connections = [...this.activeConnections.values()];
    for (const conn of connections) {
      try {
        conn.close();
      } catch (err) {
        this.logger.error('Error closing connection during shutdown', {
          connectionId: conn.connectionId,
          error: (err as Error).message,
        });
      }
    }
    this.activeConnections.clear();
    this.ticketManager.destroy();

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
    const connectionId = randomUUID();

    try {
      // 1. Extract ticket ID from the URL query string.
      const parsedUrl = new URL(request.url ?? '/', 'http://localhost');
      const query = Object.fromEntries(parsedUrl.searchParams.entries()) as Record<string, string>;
      const ticketId = query.ticket ?? query.ticket_id ?? query.token;

      if (!ticketId) {
        this.logger.warn('Ticket ID missing in WebSocket request');
        ws.close(4401, 'Ticket ID required');
        return;
      }

      // 2. Validate the ticket (read-only — do NOT consume yet).
      let ticketData: TicketData;
      try {
        ticketData = await this.ticketManager.validateTicket(ticketId);
      } catch (err) {
        this.logger.warn('Ticket validation failed', {
          ticketId,
          error: (err as Error).message,
        });
        ws.close(4401, 'Invalid or expired ticket');
        return;
      }

      const connectionSettings = ticketData.connectionSettings;

      // 2a. Check server-wide connection limit.
      if (this.maxConnections > 0 && this.activeConnections.size >= this.maxConnections) {
        this.logger.warn('Maximum connections reached', { maxConnections: this.maxConnections });
        ws.close(4429, 'Maximum connections reached');
        return;
      }

      // 2b. Check if the target session allows joining.
      if (connectionSettings.join) {
        const originalConn = this.findConnectionByGuacId(connectionSettings.join);
        const joinAllowed = originalConn?.connectionSettings.allowJoin ?? this.allowJoin;
        if (!joinAllowed) {
          this.logger.warn('Session sharing not allowed', {
            guacamoleConnectionId: connectionSettings.join,
          });
          ws.close(4403, 'Session sharing not allowed');
          return;
        }

        // 2c. Check per-session join limit.
        const joinCount = this.countJoinedConnections(connectionSettings.join);
        if (joinCount >= this.maxJoinedPerSession) {
          this.logger.warn('Maximum participants per session reached', {
            guacamoleConnectionId: connectionSettings.join,
            maxJoinedPerSession: this.maxJoinedPerSession,
          });
          ws.close(4429, 'Maximum participants per session reached');
          return;
        }
      }

      // 2d. All checks passed — consume the ticket atomically.
      try {
        ticketData = await this.ticketManager.validateAndConsume(ticketId);
      } catch (err) {
        this.logger.warn('Ticket consumption failed', {
          ticketId,
          error: (err as Error).message,
        });
        ws.close(4401, 'Invalid or expired ticket');
        return;
      }

      // 3. Build ConnectionContext for hooks.
      const context: ConnectionContext = {
        ticketId,
        request,
        connectionSettings,
        query,
        metadata: ticketData.metadata,
      };

      // 4. onBeforeConnect hook.
      if (this.options.hooks?.onBeforeConnect) {
        await this.options.hooks.onBeforeConnect(context);
      }

      // 5. onAuthenticate hook.
      if (this.options.hooks?.onAuthenticate) {
        const allowed = await this.options.hooks.onAuthenticate(context);
        if (!allowed) {
          this.logger.warn('Authentication rejected', { ticketId });
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
        this.maxInactivityTime,
        ticketData.metadata
      );

      // -- lifecycle wiring ------------------------------------------------

      clientConnection.on('ready', (conn: ClientConnection) => {
        this.logger.info('Connection ready', {
          connectionId: conn.connectionId,
          guacamoleConnectionId: conn.guacamoleConnectionId,
        });
        this.options.hooks?.onConnect?.(conn);
        this.emit('open', conn);
      });

      clientConnection.on('close', (conn: ClientConnection, error?: Error) => {
        const stats = conn.getStats();
        this.logger.info('Connection closed', {
          connectionId: conn.connectionId,
          durationMs: stats.durationMs,
          bytesReceived: stats.bytesReceived,
          bytesSent: stats.bytesSent,
        });
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
      clientConnection.connect(guacdOptions, mergedSettings, ticketData.connectionTtlMs, this.guacdInactivityTimeoutMs, this.connectTimeoutMs);

      this.activeConnections.set(connectionId, clientConnection);
    } catch (error) {
      this.logger.error('Failed to establish connection', {
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        if (error instanceof AuthenticationError) {
          ws.close(4403, 'Forbidden');
        } else {
          ws.close(1011, 'Internal server error');
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private findConnectionByGuacId(guacamoleConnectionId: string): ClientConnection | undefined {
    for (const conn of this.activeConnections.values()) {
      if (conn.guacamoleConnectionId === guacamoleConnectionId) {
        return conn;
      }
    }
    return undefined;
  }

  private countJoinedConnections(guacamoleConnectionId: string): number {
    let count = 0;
    for (const conn of this.activeConnections.values()) {
      if (
        conn.guacamoleConnectionId === guacamoleConnectionId ||
        conn.connectionSettings.join === guacamoleConnectionId
      ) {
        count++;
      }
    }
    return count;
  }

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
