import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import * as http from 'http';
import * as url from 'url';
import * as crypto from 'crypto';
import {
  WebSocketOptions,
  GuacdOptions,
  ClientOptions,
  Callbacks,
  SessionRegistry,
  SessionData,
  JoinedConnectionInfo,
  DefaultConnectionSettings,
  ConnectionSettings,
} from '../types';
import { ClientConnection } from './client-connection';
import { createLogger, Logger } from '../logging/logger';

/**
 * GuacdServer - Main server class for managing WebSocket connections to guacd
 */
export class GuacdServer extends EventEmitter {
  private webSocketServer: WebSocket.Server;
  private logger: Logger;
  private sessionRegistry: SessionRegistry;
  private sessionExpiryTimers: Map<string, NodeJS.Timeout> = new Map();
  private usingDefaultSessionRegistry: boolean;
  private activeConnections: Map<number, ClientConnection> = new Map();
  private connectionCounter = 0;

  constructor(
    private readonly wsOptions: WebSocketOptions,
    private readonly defaultGuacdOptions: GuacdOptions,
    private readonly clientOptions: ClientOptions,
    private readonly callbacks: Callbacks = {}
  ) {
    super();

    // Setup logger
    this.logger = createLogger(clientOptions.log);

    // Setup session registry
    if (callbacks.sessionRegistry) {
      this.sessionRegistry = callbacks.sessionRegistry;
      this.usingDefaultSessionRegistry = false;
    } else {
      this.sessionRegistry = this.createMapSessionRegistry();
      this.usingDefaultSessionRegistry = true;
    }

    // Setup default connection settings
    this.setupDefaultConnectionSettings();

    // Create WebSocket server
    this.webSocketServer = this.createWebSocketServer();

    // Setup error handler
    this.on('error', this.handleServerError.bind(this));

    // Setup graceful shutdown
    this.setupGracefulShutdown();

    this.logger.info(`GuacdServer started with dynamic routing and session management`);
  }

  /**
   * Create Map-based session registry wrapper
   */
  private createMapSessionRegistry(): SessionRegistry {
    const map = new Map<string, SessionData>();
    return {
      get: (sessionId: string): SessionData | null => map.get(sessionId) ?? null,
      set: (sessionId: string, data: SessionData): void => {
        map.set(sessionId, data);
      },
      delete: (sessionId: string): void => {
        map.delete(sessionId);
      },
    };
  }

  /**
   * Issue a new session ID and store connection info with optional TTL
   */
  async issueSession(
    connectionInfo: ConnectionSettings,
    ttlMs = 10 * 60 * 1000,
    guacdOptions?: GuacdOptions
  ): Promise<string> {
    const sessionId =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString('hex');

    const expiresAt = ttlMs > 0 ? new Date(Date.now() + ttlMs).toISOString() : undefined;

    const sessionData: SessionData = {
      guacdHost: guacdOptions?.host || this.defaultGuacdOptions.host || '127.0.0.1',
      guacdPort: guacdOptions?.port || this.defaultGuacdOptions.port || 4822,
      connectionInfo,
      createdAt: new Date().toISOString(),
      expiresAt,
      sessionId,
      joinedConnections: [],
    };

    await this.setSession(sessionId, sessionData, ttlMs);
    this.logger.debug(
      `Issued session ${sessionId} with ttl=${ttlMs}ms targeting guacd ${sessionData.guacdHost}:${sessionData.guacdPort}`
    );
    return sessionId;
  }

  /**
   * Setup default connection settings
   */
  private setupDefaultConnectionSettings(): void {
    const defaults: DefaultConnectionSettings = {
      rdp: {
        port: '3389',
        width: 1024,
        height: 768,
        dpi: 96,
        audio: ['audio/L16'],
        image: ['image/png', 'image/jpeg'],
      },
      vnc: {
        port: '5900',
        width: 1024,
        height: 768,
        dpi: 96,
      },
      ssh: {
        port: '22',
        'font-name': 'monospace',
        'font-size': 12,
      },
      telnet: {
        port: '23',
        'font-name': 'monospace',
        'font-size': 12,
      },
    };

    // Merge with provided defaults
    this.clientOptions.connectionDefaultSettings = {
      ...defaults,
      ...this.clientOptions.connectionDefaultSettings,
    };
  }

  /**
   * Create WebSocket server
   */
  private createWebSocketServer(): WebSocket.Server {
    const server = new WebSocket.Server(this.wsOptions as WebSocket.ServerOptions);

    server.on('connection', (ws: WebSocket, request: http.IncomingMessage) => {
      void this.handleNewConnection(ws, request);
    });

    server.on('error', (error: Error) => {
      this.logger.error(`WebSocket server error: ${error.message}`);
    });

    return server;
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleNewConnection(ws: WebSocket, request: http.IncomingMessage): Promise<void> {
    this.connectionCounter++;
    const connectionId = this.connectionCounter;

    try {
      // Parse query parameters
      const parsedUrl = url.parse(request.url || '', true);
      const query = parsedUrl.query as Record<string, string>;

      // Extract sessionId from query or headers
      const sessionId = this.extractSessionId(query);
      if (!sessionId) {
        this.logger.error('Session ID is required');
        ws.close(4401, 'Session ID required');
        return;
      }

      const session = await this.getSession(sessionId);
      if (!session) {
        this.logger.error(`Session ${sessionId} not found`);
        ws.close(4401, 'Invalid or expired session');
        return;
      }

      if (session.expiresAt && Date.parse(session.expiresAt) < Date.now()) {
        await this.deleteSession(sessionId);
        this.logger.error(`Session ${sessionId} expired`);
        ws.close(4401, 'Session expired');
        return;
      }

      const connectionInfo = session.connectionInfo;
      const isJoin = Boolean(connectionInfo?.join);
      const targetSessionId = connectionInfo?.join || null;

      const guacdOptions: GuacdOptions = {
        host: session.guacdHost || this.defaultGuacdOptions.host,
        port: session.guacdPort || this.defaultGuacdOptions.port,
      };

      // Create client connection
      const clientConnection = new ClientConnection(
        this.clientOptions,
        connectionId,
        ws,
        connectionInfo,
        sessionId,
        this.callbacks,
        this.logger
      );

      // Handle ready event (connection established with guacd)
      clientConnection.on('ready', (connection: ClientConnection): void => {
        void (async (): Promise<void> => {
          if (connection.guacamoleConnectionId) {
            try {
              if (isJoin && targetSessionId) {
                // Update existing session with join information
                const existingSession = await this.getSession(targetSessionId);
                if (existingSession) {
                  const joinInfo: JoinedConnectionInfo = {
                    connectionId: connection.connectionId,
                    guacamoleConnectionId: connection.guacamoleConnectionId,
                    joinedAt: new Date().toISOString(),
                    settings: connectionInfo?.settings,
                  };

                  existingSession.joinedConnections.push(joinInfo);
                  await this.setSession(
                    targetSessionId,
                    {
                      ...existingSession,
                      joinedConnections: existingSession.joinedConnections,
                    },
                    existingSession.expiresAt
                      ? Math.max(Date.parse(existingSession.expiresAt) - Date.now(), 0)
                      : undefined
                  );

                  this.logger.debug(
                    `Added join to session ${targetSessionId}: ${connection.guacamoleConnectionId}`
                  );
                } else {
                  this.logger.error(
                    `Cannot add join to session ${targetSessionId} - session not found`
                  );
                }
              } else if (!isJoin && connectionInfo) {
                // Register new session
                const ttlMs = session.expiresAt
                  ? Math.max(Date.parse(session.expiresAt) - Date.now(), 0)
                  : undefined;
                const sessionData: SessionData = {
                  ...session,
                  guacdHost: guacdOptions.host || '127.0.0.1',
                  guacdPort: guacdOptions.port || 4822,
                  connectionInfo,
                  guacamoleConnectionId: connection.guacamoleConnectionId,
                  joinedConnections: session.joinedConnections || [],
                  sessionId,
                };

                await this.setSession(sessionId, sessionData, ttlMs);

                this.logger.debug(
                  `Registered session ${sessionId} on guacd ${guacdOptions.host}:${guacdOptions.port}`
                );
              }
            } catch (error) {
              this.logger.error(
                `Session registry error: ${error instanceof Error ? error.message : 'Unknown error'}`
              );
            }
          }

          this.emit('open', connection);
        })().catch((err: Error) => {
          this.logger.error(`Error in ready handler: ${err.message}`);
        });
      });

      // Handle close event
      clientConnection.on('close', (connection: ClientConnection, error?: Error): void => {
        void (async (): Promise<void> => {
          // Cleanup session registry on close
          if (!isJoin) {
            try {
              await this.deleteSession(sessionId);
              this.logger.debug(`Removed session ${sessionId} from registry`);
            } catch (err) {
              this.logger.error(
                `Failed to remove session: ${err instanceof Error ? err.message : 'Unknown error'}`
              );
            }
          }

          this.activeConnections.delete(connection.connectionId);
          this.emit('close', connection, error);
        })().catch((err: Error) => {
          this.logger.error(`Error in close handler: ${err.message}`);
        });
      });

      // Handle error event
      clientConnection.on('error', (connection: ClientConnection, error: Error) => {
        this.emit('error', connection, error);
      });

      // Connect to guacd
      await clientConnection.connect(guacdOptions);

      // Store active connection
      this.activeConnections.set(connectionId, clientConnection);
    } catch (error) {
      this.logger.error(
        `Failed to establish connection: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Extract session ID from query or headers
   */
  private extractSessionId(query: Record<string, string>): string | null {
    if (query.sessionId) {
      return query.sessionId;
    }
    if (query.sessionid) {
      return query.sessionid;
    }
    return null;
  }

  /**
   * Session registry helpers
   */
  private async getSession(sessionId: string): Promise<SessionData | null> {
    const result = this.sessionRegistry.get(sessionId);
    const session = result instanceof Promise ? await result : result;
    if (session?.expiresAt && Date.parse(session.expiresAt) < Date.now()) {
      await this.deleteSession(sessionId);
      return null;
    }
    return session;
  }

  private async setSession(sessionId: string, data: SessionData, ttlMs?: number): Promise<void> {
    const result = this.sessionRegistry.set(sessionId, data);
    if (result instanceof Promise) {
      await result;
    }

    // Only manage TTL for default in-memory registry
    if (this.usingDefaultSessionRegistry) {
      const ttl =
        ttlMs ?? (data.expiresAt ? Math.max(Date.parse(data.expiresAt) - Date.now(), 0) : 0);
      if (ttl > 0) {
        this.scheduleSessionExpiry(sessionId, ttl);
      }
    }
  }

  private async deleteSession(sessionId: string): Promise<void> {
    if (this.usingDefaultSessionRegistry) {
      this.clearSessionExpiry(sessionId);
    }
    const result = this.sessionRegistry.delete(sessionId);
    if (result instanceof Promise) {
      await result;
    }
  }

  private scheduleSessionExpiry(sessionId: string, ttlMs: number): void {
    this.clearSessionExpiry(sessionId);
    const timer = setTimeout(() => {
      void this.deleteSession(sessionId).catch((err: Error) => {
        this.logger.error(`Failed to expire session ${sessionId}: ${err.message}`);
      });
    }, ttlMs);
    this.sessionExpiryTimers.set(sessionId, timer);
  }

  private clearSessionExpiry(sessionId: string): void {
    const timer = this.sessionExpiryTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.sessionExpiryTimers.delete(sessionId);
    }
  }

  /**
   * Handle server-level errors
   */
  private handleServerError(connection: ClientConnection, error: Error): void {
    this.logger.error(`Server error for connection ${connection.connectionId}: ${error.message}`);
    // Error already handled by connection, just log it
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = (): void => {
      this.logger.info('Shutting down GuacdServer...');
      this.close();
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  /**
   * Close the server
   */
  close(): void {
    this.logger.info('Closing all connections...');

    // Close all active connections
    this.activeConnections.forEach((connection) => {
      connection.close();
    });

    // Clear session expiry timers
    this.sessionExpiryTimers.forEach((timer) => clearTimeout(timer));
    this.sessionExpiryTimers.clear();

    // Close WebSocket server
    this.webSocketServer.close(() => {
      this.logger.info('GuacdServer closed');
    });

    // Remove signal handlers
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  }

  /**
   * Get active connections count
   */
  getActiveConnectionsCount(): number {
    return this.activeConnections.size;
  }

  /**
   * Get session registry (for admin/monitoring)
   */
  getSessionRegistry(): SessionRegistry {
    return this.sessionRegistry;
  }
}
