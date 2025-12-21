import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import {
  ClientOptions,
  GuacdOptions,
  Callbacks,
  Logger as ILogger,
  ConnectionState,
  GuacamoleError,
  GuacamoleErrorCode,
  ConnectionSettings,
} from '../types';
import { GuacdClient } from './guacd-client';

/**
 * ClientConnection manages a single WebSocket<->guacd bridge
 */
export class ClientConnection extends EventEmitter {
  private state: ConnectionState = ConnectionState.OPEN;
  private guacdClient: GuacdClient | null = null;
  private lastActivity: number = Date.now();
  private activityCheckInterval: NodeJS.Timeout | null = null;

  public guacamoleConnectionId: string | null = null;
  public connectionSettings: ConnectionSettings;
  public connectionSelector: string;
  public sessionId: string;

  constructor(
    private readonly clientOptions: ClientOptions,
    public readonly connectionId: number,
    private readonly webSocket: WebSocket,
    connectionSettings: ConnectionSettings,
    sessionId: string,
    private readonly callbacks: Callbacks,
    private readonly logger: ILogger
  ) {
    super();

    this.connectionSettings = connectionSettings;
    this.connectionSelector = this.getConnectionSelector(connectionSettings);
    this.sessionId = sessionId;

    this.setupWebSocketHandlers();
  }

  /**
   * Get connection selector (protocol or join ID)
   */
  private getConnectionSelector(connectionSettings: ConnectionSettings): string {
    if (!connectionSettings) {
      throw new Error('Connection settings not available');
    }

    const connection = connectionSettings;

    // Joining existing connection
    if (connection.join) {
      return connection.join;
    }

    // New connection
    if (connection.type) {
      return connection.type;
    }

    throw new Error('Connection must specify either type or join');
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    this.webSocket.on('message', this.handleWebSocketMessage.bind(this));
    this.webSocket.on('close', this.handleWebSocketClose.bind(this));
    this.webSocket.on('error', this.handleWebSocketError.bind(this));
  }

  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(message: WebSocket.Data): void {
    this.lastActivity = Date.now();
    const messageString = message.toString();
    this.logger.debug(`Received from WebSocket: ${messageString}`);

    if (this.guacdClient) {
      this.guacdClient.send(messageString, true);
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleWebSocketClose(): void {
    this.logger.verbose(`WebSocket closed for connection ${this.connectionId}`);
    this.close();
  }

  /**
   * Handle WebSocket error
   */
  private handleWebSocketError(error: Error): void {
    this.logger.error(`WebSocket error: ${error.message}`);
    this.handleError(
      new GuacamoleError(
        `WebSocket error: ${error.message}`,
        GuacamoleErrorCode.CONNECTION_ERROR,
        error
      )
    );
  }

  /**
   * Connect to guacd
   */
  async connect(guacdOptions: GuacdOptions): Promise<void> {
    this.logger.verbose(`Opening guacd connection for client ${this.connectionId}`);

    // Merge connection settings with defaults
    const mergedSettings = this.mergeConnectionOptions();

    // Process connection settings via callback if provided
    let effectiveSettings = mergedSettings;
    if (this.callbacks.processConnectionSettings) {
      await new Promise<void>((resolve, reject) => {
        this.callbacks.processConnectionSettings!(mergedSettings, (error, processed) => {
          if (error) {
            reject(error);
          } else {
            const candidate = processed || mergedSettings;
            try {
              effectiveSettings = this.normalizeSettings(candidate);
            } catch (err) {
              reject(err);
              return;
            }
            resolve();
          }
        });
      });
    } else {
      effectiveSettings = this.normalizeSettings(effectiveSettings);
    }
    this.connectionSettings.settings = effectiveSettings;

    // Validate cookies if callback provided
    if (this.callbacks.validateCookies) {
      const cookies = this.parseCookies();
      await new Promise<void>((resolve, reject) => {
        this.callbacks.validateCookies!(cookies, (error, isValid) => {
          if (error || !isValid) {
            reject(
              new GuacamoleError(
                'Cookie validation failed',
                GuacamoleErrorCode.AUTHENTICATION_FAILED,
                error
              )
            );
          } else {
            resolve();
          }
        });
      });
    }

    // Create guacd client
    this.guacdClient = new GuacdClient(
      guacdOptions,
      this.connectionSelector,
      { ...this.connectionSettings, settings: effectiveSettings },
      this.logger
    );

    // Setup guacd event handlers
    this.guacdClient.on('open', () => {
      this.logger.verbose(
        `Guacd connection opened for client ID: ${this.connectionId}, Guacamole ID: ${this.guacdClient!.guacamoleConnectionId}`
      );
      this.guacamoleConnectionId = this.guacdClient!.guacamoleConnectionId;
      this.emit('ready', this);
    });

    this.guacdClient.on('close', (error?: Error) => {
      this.close(error);
    });

    this.guacdClient.on('error', (error: Error) => {
      this.handleError(error);
    });

    this.guacdClient.on('data', (data: string) => {
      this.send(data);
    });

    // Start activity monitoring
    if (this.clientOptions.maxInactivityTime && this.clientOptions.maxInactivityTime > 0) {
      this.activityCheckInterval = setInterval(() => {
        this.checkActivity();
      }, 1000);
    }
  }

  /**
   * Parse cookies from query or headers
   */
  private parseCookies(): Record<string, string> {
    // In a real implementation, parse from WebSocket upgrade request headers
    // For now, return from query if available
    return {};
  }

  /**
   * Merge connection options with defaults
   */
  private mergeConnectionOptions(): Record<string, string | number | boolean | string[]> {
    const type = this.connectionSettings.type;
    const defaults = type && this.clientOptions.connectionDefaultSettings?.[type];

    return {
      ...defaults,
      ...this.connectionSettings.settings,
    };
  }

  /**
   * Ensure settings are restricted to allowed primitive/array types
   */
  private normalizeSettings(
    settings: Record<string, string | number | boolean | string[] | unknown>
  ): Record<string, string | number | boolean | string[]> {
    const normalized: Record<string, string | number | boolean | string[]> = {};

    Object.entries(settings).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        normalized[key] = value;
      } else if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
        normalized[key] = value;
      } else if (value !== undefined && value !== null) {
        throw new GuacamoleError(
          `Invalid setting type for "${key}"`,
          GuacamoleErrorCode.INVALID_SESSION
        );
      }
    });

    return normalized;
  }

  /**
   * Check activity and close if inactive
   */
  private checkActivity(): void {
    if (!this.clientOptions.maxInactivityTime) {
      return;
    }

    const inactiveTime = Date.now() - this.lastActivity;
    if (inactiveTime > this.clientOptions.maxInactivityTime) {
      this.logger.warn(`Connection ${this.connectionId} inactive for ${inactiveTime}ms, closing`);
      this.close(
        new GuacamoleError(
          'Session terminated due to inactivity',
          GuacamoleErrorCode.INACTIVITY_TIMEOUT
        )
      );
    }
  }

  /**
   * Send data to WebSocket
   */
  send(data: string): void {
    if (this.state === ConnectionState.CLOSED) {
      return;
    }

    this.logger.debug(`Sending to WebSocket: ${data}`);

    if (this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(data, { binary: false }, (error) => {
        if (error) {
          this.logger.error(`Failed to send to WebSocket: ${error.message}`);
          this.close(
            new GuacamoleError(
              `Failed to send to WebSocket: ${error.message}`,
              GuacamoleErrorCode.CONNECTION_ERROR,
              error
            )
          );
        }
      });
    }
  }

  /**
   * Send error to client
   */
  sendErrorToClient(message: string, code: GuacamoleErrorCode): void {
    this.logger.error(`Sending error to client: ${message} (${code})`);
    // Guacamole error instruction format: error,message,code;
    const errorInstruction = `5.error,${message.length}.${message},${code.length}.${code};`;
    this.send(errorInstruction);
  }

  /**
   * Handle error
   */
  private handleError(error: Error): void {
    this.logger.error(`Connection error: ${error.message}`);

    if (error instanceof GuacamoleError) {
      this.sendErrorToClient(error.message, error.code);
    } else {
      this.sendErrorToClient(error.message, GuacamoleErrorCode.CONNECTION_ERROR);
    }

    this.emit('error', this, error);
    this.close(error);
  }

  /**
   * Close the connection
   */
  close(error?: Error): void {
    if (this.state === ConnectionState.CLOSED || this.state === ConnectionState.CLOSING) {
      return;
    }

    this.state = ConnectionState.CLOSING;

    if (error) {
      this.logger.error(`Closing connection with error: ${error.message}`);
    } else {
      this.logger.verbose(`Closing connection ${this.connectionId}`);
    }

    // Clear activity check
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    // Close guacd connection
    if (this.guacdClient) {
      this.guacdClient.close();
      this.guacdClient = null;
    }

    // Close WebSocket
    this.webSocket.removeAllListeners();
    if (this.webSocket.readyState === WebSocket.OPEN) {
      if (error) {
        this.webSocket.close(1011, 'Internal server error');
      } else {
        this.webSocket.close(1000, 'Connection closed normally');
      }
    }

    this.state = ConnectionState.CLOSED;
    this.emit('close', this, error);
  }

  /**
   * Get current state
   */
  getState(): ConnectionState {
    return this.state;
  }
}
