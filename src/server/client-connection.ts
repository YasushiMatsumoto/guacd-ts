/**
 * WebSocket ↔ guacd bridge for a single client.
 *
 * @packageDocumentation
 */

import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import type { ConnectionSettings, ConnectionStats, GuacdOptions, ClientConnectionInfo } from '../types';
import { ConnectionState } from '../types';
import type { ILogger } from '../logging/logger';
import { GuacdClient } from './guacd-client';
import { GuacamoleParser } from '../protocols/parser';
import { ConnectionError, InactivityTimeoutError } from '../errors';
import { GuacamoleErrorCode, GUACAMOLE_STATUS_CODE } from '../errors/base';

/**
 * Manages a single WebSocket ↔ guacd tunnel.
 *
 * Events emitted:
 * - `ready` — guacd handshake complete; the bridge is live.
 * - `close` — the bridge has been torn down.
 * - `error` — an error occurred on this connection.
 */
export class ClientConnection extends EventEmitter implements ClientConnectionInfo {
  private state: ConnectionState = ConnectionState.OPENING;
  private guacdClient: GuacdClient | null = null;
  private lastActivity: number = Date.now();
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private connectionTtlTimer: NodeJS.Timeout | null = null;
  private readonly connectedAt: Date = new Date();
  private bytesReceived = 0;
  private bytesSent = 0;

  /** guacd-assigned connection ID. */
  public guacamoleConnectionId?: string;

  /** Arbitrary metadata attached at ticket issuance. */
  public readonly metadata?: Record<string, unknown>;

  constructor(
    /** Unique connection identifier (UUID v4). */
    public readonly connectionId: string,
    /** The ticket this connection originated from. */
    public readonly ticketId: string,
    /** The underlying WebSocket. */
    private readonly webSocket: WebSocket.WebSocket,
    /** Resolved connection settings. */
    public readonly connectionSettings: ConnectionSettings,
    /** Shared logger. */
    private readonly logger: ILogger,
    /** Maximum inactivity time (ms, 0 = disabled). */
    private readonly maxInactivityTime: number = 0,
    /** Arbitrary metadata from the ticket. */
    metadata?: Record<string, unknown>
  ) {
    super();
    this.metadata = metadata;
    this.setupWebSocketHandlers();
  }

  // -----------------------------------------------------------------------
  // Public
  // -----------------------------------------------------------------------

  /**
   * Open the guacd tunnel and start forwarding data.
   *
   * @param guacdOptions - Target guacd daemon.
   * @param mergedSettings - Final settings after defaults have been applied.
   * @param connectionTtlMs - Optional connection lifetime limit (ms).
   * @param guacdInactivityTimeoutMs - Inactivity timeout for the guacd TCP socket (ms, 0 = disabled).
   */
  connect(
    guacdOptions: GuacdOptions,
    mergedSettings: Record<string, string | number | boolean | string[]>,
    connectionTtlMs = 0,
    guacdInactivityTimeoutMs = 0,
    connectTimeoutMs = 10_000
  ): void {
    this.logger.verbose('Opening guacd connection', {
      connectionId: this.connectionId,
    });

    const effectiveSettings: ConnectionSettings = {
      ...this.connectionSettings,
      settings: mergedSettings,
    };

    this.guacdClient = new GuacdClient(
      guacdOptions,
      this.getConnectionSelector(),
      effectiveSettings,
      this.logger,
      guacdInactivityTimeoutMs,
      connectTimeoutMs
    );

    // Wire up guacd ↔ WebSocket forwarding.
    this.guacdClient.on('open', () => {
      this.guacamoleConnectionId = this.guacdClient?.guacamoleConnectionId ?? undefined;
      this.logger.verbose('guacd tunnel open', {
        connectionId: this.connectionId,
        guacamoleConnectionId: this.guacamoleConnectionId,
      });
      this.emit('ready', this);
    });

    this.guacdClient.on('close', (error?: Error) => this.close(error));
    this.guacdClient.on('error', (error: Error) => this.handleError(error));
    this.guacdClient.on('data', (data: string) => this.sendToWebSocket(data));

    // Inactivity monitoring.
    if (this.maxInactivityTime > 0) {
      this.activityCheckInterval = setInterval(() => this.checkActivity(), 1000);
    }

    // Connection lifetime limit.
    if (connectionTtlMs > 0) {
      this.connectionTtlTimer = setTimeout(() => {
        this.logger.info('Connection TTL exceeded', {
          connectionId: this.connectionId,
        });
        this.close();
      }, connectionTtlMs);
    }
  }

  /** Current lifecycle state. */
  getState(): ConnectionState {
    return this.state;
  }

  /** Get connection statistics. */
  getStats(): ConnectionStats {
    return {
      connectionId: this.connectionId,
      ticketId: this.ticketId,
      metadata: this.metadata,
      connectedAt: this.connectedAt,
      durationMs: Date.now() - this.connectedAt.getTime(),
      bytesReceived: this.bytesReceived,
      bytesSent: this.bytesSent,
      lastActivityAt: new Date(this.lastActivity),
    };
  }

  /** Tear down the bridge (WebSocket + guacd). */
  close(error?: Error): void {
    if (this.state === ConnectionState.CLOSED || this.state === ConnectionState.CLOSING) {
      return;
    }

    this.state = ConnectionState.CLOSING;

    if (error) {
      this.logger.error('Closing connection with error', {
        connectionId: this.connectionId,
        error: error.message,
      });
    } else {
      this.logger.debug('Closing connection', {
        connectionId: this.connectionId,
      });
    }

    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    if (this.connectionTtlTimer) {
      clearTimeout(this.connectionTtlTimer);
      this.connectionTtlTimer = null;
    }

    if (this.guacdClient) {
      this.guacdClient.close();
      this.guacdClient = null;
    }

    this.webSocket.removeAllListeners();
    if (this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.close(
        error ? 1011 : 1000,
        error ? 'Internal server error' : 'Connection closed normally'
      );
    }

    this.state = ConnectionState.CLOSED;
    this.emit('close', this, error);
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private getConnectionSelector(): string {
    if (this.connectionSettings.join) return this.connectionSettings.join;
    if (this.connectionSettings.type) return this.connectionSettings.type;
    throw new ConnectionError('Connection must specify either type or join');
  }

  private setupWebSocketHandlers(): void {
    this.webSocket.on('message', this.handleWsMessage.bind(this));
    this.webSocket.on('close', this.handleWsClose.bind(this));
    this.webSocket.on('error', this.handleWsError.bind(this));
  }

  private handleWsMessage(message: WebSocket.Data): void {
    this.lastActivity = Date.now();
    let data: string;
    if (typeof message === 'string') {
      data = message;
    } else if (Buffer.isBuffer(message)) {
      data = message.toString('utf-8');
    } else if (Array.isArray(message)) {
      data = Buffer.concat(message).toString('utf-8');
    } else {
      data = Buffer.from(message).toString('utf-8');
    }
    this.bytesReceived += Buffer.byteLength(data, 'utf-8');
    if (this.guacdClient) {
      this.guacdClient.send(data, true);
    } else {
      this.logger.debug('WebSocket message dropped, no guacd client', {
        connectionId: this.connectionId,
      });
    }
  }

  private handleWsClose(): void {
    this.logger.verbose('WebSocket closed', {
      connectionId: this.connectionId,
    });
    this.close();
  }

  private handleWsError(error: Error): void {
    this.logger.error('WebSocket error', {
      connectionId: this.connectionId,
      error: error.message,
    });
    this.handleError(new ConnectionError(`WebSocket error: ${error.message}`));
  }

  private sendToWebSocket(data: string): void {
    if (this.state === ConnectionState.CLOSED) return;
    this.bytesSent += Buffer.byteLength(data, 'utf-8');
    if (this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(data, { binary: false }, (error) => {
        if (error) {
          this.logger.error('Failed to send to WebSocket', {
            error: error.message,
          });
          this.close(new ConnectionError(`Failed to send to WebSocket: ${error.message}`));
        }
      });
    }
  }

  /**
   * Send a Guacamole `error` instruction to the connected client.
   */
  private sendErrorToClient(message: string, code: GuacamoleErrorCode): void {
    this.logger.debug('Sending error to client', { message, code });
    const statusCode = GUACAMOLE_STATUS_CODE[code] ?? 512;
    this.sendToWebSocket(GuacamoleParser.toInstruction(['error', message, String(statusCode)]));
  }

  private handleError(error: Error): void {
    this.logger.error('Connection error', {
      connectionId: this.connectionId,
      error: error.message,
    });

    const code =
      'code' in error
        ? (error as { code: GuacamoleErrorCode }).code
        : GuacamoleErrorCode.CONNECTION_ERROR;
    this.sendErrorToClient(error.message, code);

    this.emit('error', this, error);
    this.close(error);
  }

  private checkActivity(): void {
    if (!this.maxInactivityTime) return;

    const idle = Date.now() - this.lastActivity;
    if (idle > this.maxInactivityTime) {
      this.logger.warn('Connection inactive', {
        connectionId: this.connectionId,
        idleMs: idle,
      });
      this.close(new InactivityTimeoutError(idle));
    }
  }
}
