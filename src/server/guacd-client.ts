/**
 * TCP client for the guacd daemon.
 *
 * Handles the Guacamole protocol handshake (select → args → connect → ready)
 * and bidirectional instruction forwarding.
 *
 * @packageDocumentation
 */

import { EventEmitter } from 'events';
import * as net from 'net';
import type { ConnectionSettings, GuacdOptions } from '../types';
import { ConnectionState } from '../types';
import type { ILogger } from '../logging/logger';
import { GuacamoleParser } from '../protocols/parser';
import {
  ConnectionError,
  ConnectionTimeoutError,
  ConnectionResetError,
  HandshakeError,
  ServiceUnavailableError,
  ServiceNotFoundError,
} from '../errors';

/**
 * Manages a single TCP connection to the guacd daemon and performs the
 * Guacamole protocol handshake.
 *
 * Events emitted:
 * - `open`  — handshake complete, tunnel is ready
 * - `data`  — a Guacamole instruction received from guacd
 * - `close` — connection closed (optional `Error` argument)
 * - `error` — connection error (with a {@link GuacamoleError} subclass)
 */
export class GuacdClient extends EventEmitter {
  private state: ConnectionState = ConnectionState.OPENING;
  private connection: net.Socket | null = null;
  private parser: GuacamoleParser;
  private static readonly MAX_SEND_BUFFER_BYTES = 10 * 1024 * 1024;
  private sendBuffer = '';
  private sendBufferSize = 0;
  private lastActivity: number = Date.now();
  private activityCheckInterval: NodeJS.Timeout | null = null;

  /** guacd-assigned connection ID (e.g. `"$abcdef-1234"`). */
  public guacamoleConnectionId: string | null = null;

  constructor(
    private readonly guacdOptions: GuacdOptions,
    private readonly connectionSelector: string,
    private readonly connectionSettings: ConnectionSettings,
    private readonly logger: ILogger,
    /** Inactivity timeout for the guacd TCP socket (ms, 0 = disabled). */
    private readonly inactivityTimeoutMs: number = 10_000,
    /** TCP connect timeout in ms (0 = disabled). */
    private readonly connectTimeoutMs: number = 10_000
  ) {
    super();

    this.parser = new GuacamoleParser();
    this.parser.oninstruction = this.processInstruction.bind(this);
    this.parser.onerror = (error: Error): void => {
      this.close(new ConnectionError(error.message));
    };

    this.connect();
  }

  // -----------------------------------------------------------------------
  // Connection lifecycle
  // -----------------------------------------------------------------------

  private connect(): void {
    const host = this.guacdOptions.host ?? '127.0.0.1';
    const port = this.guacdOptions.port ?? 4822;

    this.logger.verbose('Connecting to guacd', { host, port, selector: this.connectionSelector });

    this.connection = net.connect(port, host);

    if (this.connectTimeoutMs > 0) {
      this.connection.setTimeout(this.connectTimeoutMs);
      this.connection.once('timeout', () => {
        this.logger.warn('guacd connect timeout', { host, port, timeoutMs: this.connectTimeoutMs });
        this.close(new ConnectionTimeoutError(host, port, this.connectTimeoutMs));
      });
    }

    this.connection.on('connect', this.handleConnect.bind(this));
    this.connection.on('data', this.handleData.bind(this));
    this.connection.on('close', this.handleClose.bind(this));
    this.connection.on('error', this.handleError.bind(this));

    if (this.inactivityTimeoutMs > 0) {
      this.activityCheckInterval = setInterval(() => {
        if (Date.now() > this.lastActivity + this.inactivityTimeoutMs) {
          const host = this.guacdOptions.host ?? '127.0.0.1';
          const port = this.guacdOptions.port ?? 4822;
          this.logger.warn('guacd inactivity timeout', { host, port, timeoutMs: this.inactivityTimeoutMs });
          this.close(new ConnectionTimeoutError(host, port, this.inactivityTimeoutMs));
        }
      }, 1000);
    }
  }

  private handleConnect(): void {
    if (this.connection) {
      this.connection.setTimeout(0);
    }
    this.logger.debug('guacd TCP connection established');
    this.sendInstruction(['select', this.connectionSelector]);
  }

  private handleData(data: Buffer): void {
    this.lastActivity = Date.now();
    this.parser.receive(data.toString('utf8'));
  }

  private handleClose(hadError: boolean): void {
    this.logger.debug('guacd TCP connection closed', {
      hadError,
      selector: this.connectionSelector,
      connId: this.guacamoleConnectionId ?? 'n/a',
    });
    const error = hadError ? new ConnectionError('Connection closed unexpectedly') : undefined;
    this.close(error);
  }

  private handleError(error: Error & { code?: string }): void {
    const host = this.guacdOptions.host ?? '127.0.0.1';
    const port = this.guacdOptions.port ?? 4822;

    this.logger.error('guacd TCP error', { host, port, code: error.code });

    let typed: Error;
    switch (error.code) {
      case 'ECONNREFUSED':
        typed = new ServiceUnavailableError(host, port);
        break;
      case 'ENOTFOUND':
        typed = new ServiceNotFoundError(host);
        break;
      case 'ETIMEDOUT':
        typed = new ConnectionTimeoutError(host, port, this.inactivityTimeoutMs);
        break;
      case 'ECONNRESET':
        typed = new ConnectionResetError(host, port);
        break;
      default:
        typed = new ConnectionError(`guacd connection error: ${error.message}`);
    }

    this.emit('error', typed);
    this.close(typed);
  }

  // -----------------------------------------------------------------------
  // Instruction processing
  // -----------------------------------------------------------------------

  private processInstruction(opcode: string, params: string[]): void {
    if (opcode === 'args') {
      this.sendHandshakeReply(params);
      return;
    }

    if (opcode === 'ready') {
      this.guacamoleConnectionId = params[0];
      if (!this.guacamoleConnectionId) {
        this.logger.error('guacd sent ready with empty connection ID');
        this.close(new HandshakeError('guacd sent ready instruction with empty connection ID'));
        return;
      }

      this.logger.debug('guacd connection ready', {
        connectionId: this.guacamoleConnectionId,
      });

      if (this.state !== ConnectionState.OPEN) {
        this.state = ConnectionState.OPEN;
        this.emit('open', this);

        if (this.sendBuffer) {
          this.send(this.sendBuffer);
          this.sendBuffer = '';
          this.sendBufferSize = 0;
        }
      }

      this.emit('data', GuacamoleParser.toInstruction(['', this.guacamoleConnectionId ?? '']));
      return;
    }

    if (opcode === 'error' && this.state === ConnectionState.OPENING) {
      const statusCode = params[1] ?? 'unknown';
      this.logger.warn('guacd rejected connection', { statusCode });
      this.close(new HandshakeError(`guacd rejected connection (status ${statusCode})`));
      return;
    }

    // Forward everything else to the client side.
    this.emit('data', GuacamoleParser.toInstruction([opcode, ...params]));
  }

  // -----------------------------------------------------------------------
  // Handshake
  // -----------------------------------------------------------------------

  /**
   * Negotiate the highest VERSION_* token offered by the server.
   */
  private pickProtocolVersion(serverHandshake: string[]): string | null {
    const versions = serverHandshake
      .filter((x) => x.startsWith('VERSION_'))
      .map((x) => x.substring('VERSION_'.length));

    if (versions.length === 0) return null;

    const parse = (v: string): number[] => v.split('_').map(Number);

    versions.sort((a, b) => {
      const aa = parse(a);
      const bb = parse(b);
      for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
        if ((aa[i] ?? 0) !== (bb[i] ?? 0)) return (bb[i] ?? 0) - (aa[i] ?? 0);
      }
      return 0;
    });

    return versions[0];
  }

  private isAtLeast(protocolVersion: string | null, major: number, minor: number): boolean {
    if (!protocolVersion) return false;
    const parts = protocolVersion.split('_').map(Number);
    return (parts[0] ?? 0) > major || ((parts[0] ?? 0) === major && (parts[1] ?? 0) >= minor);
  }

  private sendHandshakeReply(serverHandshake: string[]): void {
    const settings = this.connectionSettings.settings as Record<string, unknown>;
    const picked = this.pickProtocolVersion(serverHandshake);
    const protocolToken = picked ? `VERSION_${picked}` : '';
    this.logger.debug('Protocol version negotiated', { version: picked ?? 'none' });

    this.sendClientCapabilities(picked);

    const connectArgs: string[] = serverHandshake.map((argName) => {
      if (argName.startsWith('VERSION_')) return protocolToken;
      const value = settings[argName];
      if (Array.isArray(value)) return value.map(String).join(',');
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      return '';
    });

    this.sendInstruction(['connect', ...connectArgs]);
  }

  private sendClientCapabilities(protocolVersion: string | null): void {
    const s = this.connectionSettings.settings as Record<string, unknown>;

    const width = (s.width ?? 1024) as number;
    const height = (s.height ?? 768) as number;
    const dpi = (s.dpi ?? 96) as number;
    this.sendInstruction(['size', String(width), String(height), String(dpi)]);

    const toList = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.map(String);
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        const str = String(v);
        return str.length ? [str] : [];
      }
      return [];
    };

    this.sendInstruction(['audio', ...toList(s.audio)]);
    this.sendInstruction(['video', ...toList(s.video)]);

    const images = toList(s.image);
    this.sendInstruction(['image', ...(images.length > 0 ? images : ['image/png', 'image/jpeg'])]);

    if (this.isAtLeast(protocolVersion, 1, 1)) {
      const tz = s.timezone as string | undefined;
      if (tz !== undefined && tz !== null && String(tz).length > 0) {
        this.sendInstruction(['timezone', String(tz)]);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Send helpers
  // -----------------------------------------------------------------------

  private sendInstruction(instruction: string[]): void {
    this.send(GuacamoleParser.toInstruction(instruction));
  }

  /**
   * Send raw data to guacd.
   *
   * @param data         - Guacamole wire-format string.
   * @param afterOpened  - If `true`, buffer data until the tunnel is open.
   */
  send(data: string, afterOpened = false): void {
    if (this.state === ConnectionState.CLOSED) return;

    if (afterOpened && this.state === ConnectionState.OPENING) {
      const dataSize = Buffer.byteLength(data, 'utf8');
      if (this.sendBufferSize + dataSize > GuacdClient.MAX_SEND_BUFFER_BYTES) {
        this.logger.warn('Send buffer overflow', {
          bufferSize: this.sendBufferSize + dataSize,
          maxSize: GuacdClient.MAX_SEND_BUFFER_BYTES,
        });
        this.close(new ConnectionError('Send buffer overflow'));
        return;
      }
      this.sendBuffer += data;
      this.sendBufferSize += dataSize;
      return;
    }

    if (!this.connection) {
      throw new ConnectionError('No guacd connection available');
    }

    this.lastActivity = Date.now();
    this.connection.write(data, (error) => {
      if (error) {
        this.close(new ConnectionError(`Failed to send data to guacd: ${error.message}`));
      }
    });
  }

  // -----------------------------------------------------------------------
  // Teardown
  // -----------------------------------------------------------------------

  /** Close the TCP connection to guacd. */
  close(error?: Error): void {
    if (this.state === ConnectionState.CLOSED) return;

    if (error) {
      this.logger.error('Closing guacd connection with error', { error: error.message });
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

  /** Current lifecycle state. */
  getState(): ConnectionState {
    return this.state;
  }
}
