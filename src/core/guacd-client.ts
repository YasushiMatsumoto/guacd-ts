import { EventEmitter } from 'events';
import * as net from 'net';
import {
  GuacdOptions,
  ConnectionSettings,
  Logger as ILogger,
  ConnectionState,
  GuacamoleError,
  GuacamoleErrorCode,
} from '../types';
import { GuacamoleParser } from '../protocols/parser';

/**
 * GuacdClient manages the connection to the guacd daemon
 */
export class GuacdClient extends EventEmitter {
  // Lifecycle state for TCP session toward guacd
  private state: ConnectionState = ConnectionState.OPENING;
  // Underlying TCP socket to guacd
  private connection: net.Socket | null = null;
  // Guacamole instruction parser
  private parser: GuacamoleParser;
  // Buffer for messages that arrive before ready/open
  private sendBuffer = '';
  // Last time we saw activity from guacd (for inactivity timeout)
  private lastActivity: number = Date.now();
  private activityCheckInterval: NodeJS.Timeout | null = null;
  // Becomes true after guacd sends "ready" (post-handshake traffic)
  private handshakeComplete = false;

  // Guacamole connection ID returned by guacd after ready
  public guacamoleConnectionId: string | null = null;

  constructor(
    // Target guacd host/port
    private readonly guacdOptions: GuacdOptions,
    // Selector sent in initial "select" (protocol or join id)
    private readonly connectionSelector: string,
    // Connection settings (handshake args & capabilities)
    private readonly connectionSettings: ConnectionSettings,
    // Logger instance (shared from server)
    private readonly logger: ILogger
  ) {
    super();

    this.parser = new GuacamoleParser();
    this.parser.oninstruction = this.processInstruction.bind(this);

    this.connect();
  }

  /**
   * Connect to guacd
   */
  private connect(): void {
    const host = this.guacdOptions.host || '127.0.0.1';
    const port = this.guacdOptions.port || 4822;

    this.logger.verbose(
      `Connecting to guacd at ${host}:${port} selector=${this.connectionSelector}`
    );
    this.logger.debug(
      `Connection settings keys: ${Object.keys(this.connectionSettings.settings).join(',')}`
    );

    this.connection = net.connect(port, host);

    this.connection.on('connect', this.handleConnect.bind(this));
    this.connection.on('data', this.handleData.bind(this));
    this.connection.on('close', this.handleClose.bind(this));
    this.connection.on('error', this.handleError.bind(this));

    // Start activity monitoring
    this.activityCheckInterval = setInterval(() => {
      if (Date.now() > this.lastActivity + 10000) {
        this.close(
          new GuacamoleError(
            'guacd connection inactive for too long',
            GuacamoleErrorCode.INACTIVITY_TIMEOUT
          )
        );
      }
    }, 1000);
  }

  /**
   * Handle connection established
   */
  private handleConnect(): void {
    this.logger.verbose('guacd connection established');
    this.logger.verbose(`Selecting connection: ${this.connectionSelector}`);
    this.sendInstruction(['select', this.connectionSelector]);
  }

  /**
   * Handle data received from guacd
   */
  private handleData(data: Buffer): void {
    this.lastActivity = Date.now();
    const dataString = data.toString('utf8');

    // TEMP: Always debug until black-screen is resolved
    this.logger.debug?.(`Received from guacd: ${dataString}`);

    this.parser.receive(dataString);
  }

  /**
   * Handle connection closed
   */
  private handleClose(hadError: boolean): void {
    this.logger.debug(
      `guacd TCP connection closed hadError=${hadError} selector=${this.connectionSelector} connId=${this.guacamoleConnectionId ?? 'n/a'}`
    );
    const error = hadError
      ? new GuacamoleError('Connection closed unexpectedly', GuacamoleErrorCode.CONNECTION_ERROR)
      : undefined;
    this.close(error);
  }

  /**
   * Handle connection error
   */
  private handleError(error: Error & { code?: string }): void {
    let guacError: GuacamoleError;

    switch (error.code) {
      case 'ECONNREFUSED':
        guacError = new GuacamoleError(
          'guacd service unavailable',
          GuacamoleErrorCode.SERVICE_UNAVAILABLE,
          error
        );
        break;
      case 'ENOTFOUND':
        guacError = new GuacamoleError(
          'guacd service not found',
          GuacamoleErrorCode.SERVICE_NOT_FOUND,
          error
        );
        break;
      case 'ETIMEDOUT':
        guacError = new GuacamoleError(
          'Connection to guacd timed out',
          GuacamoleErrorCode.CONNECTION_TIMEOUT,
          error
        );
        break;
      case 'ECONNRESET':
        guacError = new GuacamoleError(
          'Connection to guacd reset',
          GuacamoleErrorCode.CONNECTION_RESET,
          error
        );
        break;
      default:
        guacError = new GuacamoleError(
          `guacd connection error: ${error.message}`,
          GuacamoleErrorCode.CONNECTION_ERROR,
          error
        );
    }

    this.emit('error', guacError);
    this.close(guacError);
  }

  /**
   * Process received instruction
   */
  private processInstruction(opcode: string, params: string[]): void {
    // Handle server handshake
    if (opcode === 'args') {
      this.sendHandshakeReply(params);
      return;
    }

    // Handle ready instruction
    if (opcode === 'ready') {
      this.guacamoleConnectionId = params[0];
      this.logger.verbose(`Connection ${this.guacamoleConnectionId} is ready`);

      if (this.state !== ConnectionState.OPEN) {
        this.state = ConnectionState.OPEN;
        this.handshakeComplete = true;
        this.emit('open', this);

        // Send buffered data
        if (this.sendBuffer) {
          this.send(this.sendBuffer);
          this.sendBuffer = '';
        }
      }

      // Keep existing behavior for now (matches guacamole-lite approach)
      this.emit('data', GuacamoleParser.toInstruction(['', this.guacamoleConnectionId]));
      return;
    }

    // Forward all other instructions to client
    this.emit('data', GuacamoleParser.toInstruction([opcode, ...params]));
  }

  /**
   * Pick the highest VERSION_* token from server handshake.
   * Returns version string like "1_5_0" or null if none found.
   */
  private pickProtocolVersion(serverHandshake: string[]): string | null {
    const versions = serverHandshake
      .filter((x) => x.startsWith('VERSION_'))
      .map((x) => x.substring('VERSION_'.length));

    if (versions.length === 0) return null;

    const parse = (v: string): number[] => v.split('_').map((n) => Number(n) || 0);

    versions.sort((a, b) => {
      const aa = parse(a);
      const bb = parse(b);
      for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
        const da = aa[i] ?? 0;
        const db = bb[i] ?? 0;
        if (da !== db) return db - da; // desc
      }
      return 0;
    });

    return versions[0];
  }

  /**
   * Check if protocolVersion is >= major.minor (patch ignored).
   */
  private isAtLeast(protocolVersion: string | null, major: number, minor: number): boolean {
    if (!protocolVersion) return false;
    const parts = protocolVersion.split('_').map((n) => Number(n) || 0);
    const maj = parts[0] ?? 0;
    const min = parts[1] ?? 0;
    return maj > major || (maj === major && min >= minor);
  }

  /**
   * Send handshake reply
   *
   * IMPORTANT:
   * - Do not blindly echo VERSION_* tokens.
   * - Choose exactly one VERSION_* and respond with it.
   * - Build connect args with the exact arity/order of serverHandshake.
   */
  private sendHandshakeReply(serverHandshake: string[]): void {
    const settings = this.connectionSettings.settings as Record<string, unknown>;

    const picked = this.pickProtocolVersion(serverHandshake);
    const protocolToken = picked ? `VERSION_${picked}` : '';

    // Send client capabilities BEFORE connect
    this.sendClientCapabilities(picked);

    // Build connect args in the exact order/arity of serverHandshake
    const connectArgs: string[] = serverHandshake.map((argName) => {
      if (argName.startsWith('VERSION_')) {
        return protocolToken;
      }

      const value = settings[argName];
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) return value.map(String).join(',');
      return String(value);
    });

    this.sendInstruction(['connect', ...connectArgs]);
  }

  /**
   * Send client capabilities (size, audio/video/image, timezone) before connect
   */
  private sendClientCapabilities(protocolVersion: string | null): void {
    const s = this.connectionSettings.settings as Record<string, unknown>;

    // Use stable defaults instead of empty strings
    const width = s.width ?? 1024;
    const height = s.height ?? 768;
    const dpi = s.dpi ?? 96;
    this.sendInstruction(['size', String(width), String(height), String(dpi)]);

    // Media support lists
    const audioList = this.toList(s.audio);
    const videoList = this.toList(s.video);

    // Fix: default fallback must apply when list is empty
    const imageListRaw = this.toList(s.image);
    const imageList = imageListRaw.length > 0 ? imageListRaw : ['image/png', 'image/jpeg'];

    this.sendInstruction(['audio', ...audioList]);
    this.sendInstruction(['video', ...videoList]);
    this.sendInstruction(['image', ...imageList]);

    // timezone is valid for 1.1.0+ (so 1.5.0 also OK)
    if (this.isAtLeast(protocolVersion, 1, 1)) {
      const tz = s.timezone;
      if (tz !== null && tz !== undefined && String(tz).length > 0) {
        this.sendInstruction(['timezone', String(tz)]);
      }
    }

    // NOTE: Do not send 'name' here to reduce variables (and match guacamole-lite closer)
  }

  private toList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((v) => String(v));
    }
    if (value === undefined || value === null) return [];
    const str = String(value);
    if (!str.length) return [];
    return [str];
  }

  /**
   * Send instruction to guacd
   */
  private sendInstruction(instruction: string[]): void {
    const data = GuacamoleParser.toInstruction(instruction);
    this.send(data);
  }

  /**
   * Send data to guacd
   */
  send(data: string, afterOpened = false): void {
    if (this.state === ConnectionState.CLOSED) {
      return;
    }

    if (afterOpened && this.state === ConnectionState.OPENING) {
      this.sendBuffer += data;
      return;
    }

    const level = this.handshakeComplete ? 'verbose' : 'debug';
    this.logger[level as 'verbose' | 'debug']?.(`Sending to guacd: ${data}`);

    if (!this.connection) {
      throw new GuacamoleError(
        'No guacd connection available',
        GuacamoleErrorCode.CONNECTION_ERROR
      );
    }

    this.connection.write(data, (error) => {
      if (error) {
        this.close(
          new GuacamoleError(
            `Failed to send data to guacd: ${error.message}`,
            GuacamoleErrorCode.CONNECTION_ERROR,
            error
          )
        );
      }
    });
  }

  /**
   * Close the connection
   */
  close(error?: Error): void {
    if (this.state === ConnectionState.CLOSED) {
      return;
    }

    if (error) {
      this.logger.error(`Closing guacd connection with error: ${error.message}`);
    } else {
      this.logger.verbose('Closing guacd connection');
    }

    this.state = ConnectionState.CLOSED;

    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    if (this.connection) {
      this.connection.removeAllListeners();

      if (!this.connection.destroyed) {
        this.connection.end();
        this.connection.destroy();
      }

      this.connection = null;
    }

    this.emit('close', error);
  }

  /**
   * Get current state
   */
  getState(): ConnectionState {
    return this.state;
  }
}
