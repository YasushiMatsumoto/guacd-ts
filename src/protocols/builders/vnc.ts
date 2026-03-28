/**
 * VNC connection builder.
 *
 * @packageDocumentation
 */

import type { ConnectionSettings } from '../../types';
import type { VNCConnectionParams, ValidationResult } from '../types';
import { DEFAULT_PORTS } from '../types';
import { BaseConnectionBuilder } from './base';

/**
 * Fluent builder for VNC connections with validation and sensible defaults.
 *
 * @example
 * ```ts
 * const settings = new VNCConnectionBuilder()
 *   .hostname('192.168.1.50')
 *   .password('vncpass')
 *   .build();
 * ```
 */
export class VNCConnectionBuilder extends BaseConnectionBuilder<VNCConnectionParams> {
  constructor() {
    super('vnc');
    this.params.port = DEFAULT_PORTS.vnc;
    this.params.cursor = 'remote';
    this.params['color-depth'] = 24;
  }

  // -- Network / Target ---------------------------------------------------

  /** Set the target hostname or IP address. */
  hostname(hostname: string): this {
    this.params.hostname = hostname;
    return this;
  }

  /** Set the target port (default `5900`). */
  port(port: number): this {
    this.params.port = port;
    return this;
  }

  // -- Authentication -----------------------------------------------------

  /** Set the VNC password. */
  password(password: string): this {
    this.params.password = password;
    return this;
  }

  /** Set the VNC username (if the server requires one). */
  username(username: string): this {
    this.params.username = username;
    return this;
  }

  // -- Display / Encoding -------------------------------------------------

  /** Set cursor rendering mode. */
  cursor(mode: 'local' | 'remote'): this {
    this.params.cursor = mode;
    return this;
  }

  /** Set the colour depth (8, 16, 24, or 32 bits). */
  colorDepth(depth: 8 | 16 | 24 | 32): this {
    this.params['color-depth'] = depth;
    return this;
  }

  /** Force lossless image compression. */
  forceLossless(enable = true): this {
    this.params['force-lossless'] = enable;
    return this;
  }

  /** Swap red and blue colour components. */
  swapRedBlue(swap = true): this {
    this.params['swap-red-blue'] = swap;
    return this;
  }

  /** Set the display width in pixels. */
  width(width: number): this {
    this.params.width = width;
    return this;
  }

  /** Set the display height in pixels. */
  height(height: number): this {
    this.params.height = height;
    return this;
  }

  /** Set the display DPI. */
  dpi(dpi: number): this {
    this.params.dpi = dpi;
    return this;
  }

  /** Set the zlib compression level (0–9). */
  compressLevel(level: number): this {
    this.params['compress-level'] = level;
    return this;
  }

  /** Set the JPEG quality level (0–9, tight encoding). */
  qualityLevel(level: number): this {
    this.params['quality-level'] = level;
    return this;
  }

  /** Disable display resize negotiation. */
  disableDisplayResize(disable = true): this {
    this.params['disable-display-resize'] = disable;
    return this;
  }

  /** Request the server to stop accepting input from other clients. */
  disableServerInput(disable = true): this {
    this.params['disable-server-input'] = disable;
    return this;
  }

  // -- Reverse connection -------------------------------------------------

  /** Enable reverse VNC connection (listen mode). */
  reverseConnect(enable = true, listenTimeoutMs?: number): this {
    this.params['reverse-connect'] = enable;
    if (listenTimeoutMs !== undefined) this.params['listen-timeout'] = listenTimeoutMs;
    return this;
  }

  // -- Input / Clipboard --------------------------------------------------

  /** Enable read-only mode. */
  readOnly(readOnly = true): this {
    this.params['read-only'] = readOnly;
    return this;
  }

  /** Disable copy from remote to client. */
  disableCopy(disable = true): this {
    this.params['disable-copy'] = disable;
    return this;
  }

  /** Disable paste from client to remote. */
  disablePaste(disable = true): this {
    this.params['disable-paste'] = disable;
    return this;
  }

  // -- SFTP ---------------------------------------------------------------

  /** Enable SFTP-based file transfer. */
  enableSFTP(hostname: string, username: string, password?: string, port = 22): this {
    this.params['enable-sftp'] = true;
    this.params['sftp-hostname'] = hostname;
    this.params['sftp-port'] = port;
    this.params['sftp-username'] = username;
    if (password) this.params['sftp-password'] = password;
    return this;
  }

  // -- Audio --------------------------------------------------------------

  /** Set the PulseAudio server name for audio support. */
  audioServer(name: string): this {
    this.params['audio-servername'] = name;
    return this;
  }

  // -- Retry --------------------------------------------------------------

  /** Number of automatic reconnection attempts. */
  autoRetry(attempts: number): this {
    this.params.autoretry = attempts;
    return this;
  }

  // -- Recording ----------------------------------------------------------

  /** Enable server-side session recording. */
  enableRecording(path: string, name?: string): this {
    this.params['recording-path'] = path;
    this.params['recording-name'] = name ?? `vnc-${Date.now()}`;
    this.params['create-recording-path'] = true;
    return this;
  }

  // -- Bulk ---------------------------------------------------------------

  /**
   * Set arbitrary VNC parameters in bulk.
   */
  withParams(params: Partial<Omit<VNCConnectionParams, 'type'>>): this {
    this.params = { ...this.params, ...params };
    return this;
  }

  // -- Validation / Build -------------------------------------------------

  /** @inheritdoc */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.params.hostname) errors.push('hostname is required');

    const portErr = this.validatePort(this.params.port);
    if (portErr) errors.push(portErr);

    if (!this.params.password && !this.params.username)
      warnings.push('No authentication credentials provided');

    return { valid: errors.length === 0, errors, warnings };
  }

  /** @inheritdoc */
  build(): ConnectionSettings {
    const v = this.validate();
    if (!v.valid) throw new Error(`Invalid VNC connection: ${v.errors.join(', ')}`);
    return this.toConnectionSettings();
  }
}
