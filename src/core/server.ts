import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import * as http from 'http';
import * as url from 'url';
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
    this.sessionRegistry = callbacks.sessionRegistry || this.createMapSessionRegistry();

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

      // Extract guacd options (dynamic routing + session join support)
      const { guacdOptions, connectionInfo, isJoin, targetSessionId } =
        await this.extractGuacdOptions(query);

      // Create client connection
      const clientConnection = new ClientConnection(
        this.clientOptions,
        connectionId,
        ws,
        query,
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
                  await this.setSession(targetSessionId, existingSession);

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
                const sessionData: SessionData = {
                  guacdHost: guacdOptions.host || '127.0.0.1',
                  guacdPort: guacdOptions.port || 4822,
                  connectionInfo,
                  createdAt: new Date().toISOString(),
                  joinedConnections: [],
                };

                await this.setSession(connection.guacamoleConnectionId, sessionData);

                this.logger.debug(
                  `Registered new session ${connection.guacamoleConnectionId} on guacd ${guacdOptions.host}:${guacdOptions.port}`
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
          if (connection.guacamoleConnectionId && !isJoin) {
            try {
              await this.deleteSession(connection.guacamoleConnectionId);
              this.logger.debug(
                `Removed session ${connection.guacamoleConnectionId} from registry`
              );
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
   * Extract guacd options from query (supports dynamic routing and session join)
   */
  private async extractGuacdOptions(query: Record<string, string>): Promise<{
    guacdOptions: GuacdOptions;
    connectionInfo: ConnectionSettings;
    isJoin: boolean;
    targetSessionId: string | null;
  }> {
    // This would decrypt the token and extract connection info
    // For now, returning default
    const connection = query.connection ? JSON.parse(query.connection) : null;

    // Handle session join
    if (connection?.join) {
      const sessionId = connection.join;
      const session = await this.getSession(sessionId);

      if (session) {
        const sessionGuacdOptions: GuacdOptions = {
          host: session.guacdHost,
          port: session.guacdPort,
        };

        this.logger.info(
          `Routing join request to session ${sessionId} on guacd ${sessionGuacdOptions.host}:${sessionGuacdOptions.port}`
        );

        return {
          guacdOptions: sessionGuacdOptions,
          connectionInfo: connection,
          isJoin: true,
          targetSessionId: sessionId,
        };
      }
    }

    // Handle dynamic routing for new connections
    if (connection?.guacdHost || connection?.guacdPort) {
      const dynamicGuacdOptions: GuacdOptions = {
        host: connection.guacdHost || this.defaultGuacdOptions.host,
        port: connection.guacdPort || this.defaultGuacdOptions.port,
      };

      this.logger.info(
        `Routing new connection to guacd: ${dynamicGuacdOptions.host}:${dynamicGuacdOptions.port}`
      );

      return {
        guacdOptions: dynamicGuacdOptions,
        connectionInfo: connection,
        isJoin: false,
        targetSessionId: null,
      };
    }

    // Default routing
    return {
      guacdOptions: this.defaultGuacdOptions,
      connectionInfo: connection,
      isJoin: false,
      targetSessionId: null,
    };
  }

  /**
   * Session registry helpers
   */
  private async getSession(sessionId: string): Promise<SessionData | null> {
    const result = this.sessionRegistry.get(sessionId);
    return result instanceof Promise ? await result : result;
  }

  private async setSession(sessionId: string, data: SessionData): Promise<void> {
    const result = this.sessionRegistry.set(sessionId, data);
    if (result instanceof Promise) {
      await result;
    }
  }

  private async deleteSession(sessionId: string): Promise<void> {
    const result = this.sessionRegistry.delete(sessionId);
    if (result instanceof Promise) {
      await result;
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
