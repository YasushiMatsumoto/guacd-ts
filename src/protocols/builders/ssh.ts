/**
 * SSH connection builder.
 *
 * @packageDocumentation
 */

import type { ConnectionSettings } from '../../types';
import type { SSHConnectionParams, TerminalColorScheme, ValidationResult } from '../types';
import { DEFAULT_PORTS } from '../types';
import { BaseConnectionBuilder } from './base';

/**
 * Fluent builder for SSH connections with validation and sensible defaults.
 *
 * @example
 * ```ts
 * const settings = new SSHConnectionBuilder()
 *   .hostname('192.168.1.10')
 *   .username('root')
 *   .password('secret')
 *   .build();
 * ```
 */
export class SSHConnectionBuilder extends BaseConnectionBuilder<SSHConnectionParams> {
  constructor() {
    super('ssh');
    this.params.port = DEFAULT_PORTS.ssh;
    this.params['font-name'] = 'monospace';
    this.params['font-size'] = 12;
    this.params.scrollback = 1000;
    this.params['color-scheme'] = 'gray-black';
    this.params['server-alive-interval'] = 30;
  }

  // -- Network / Target ---------------------------------------------------

  /** Set the target hostname or IP address. */
  hostname(hostname: string): this {
    this.params.hostname = hostname;
    return this;
  }

  /** Set the target port (default `22`). */
  port(port: number): this {
    this.params.port = port;
    return this;
  }

  /** Set the connection timeout in seconds. */
  timeout(seconds: number): this {
    this.params.timeout = seconds;
    return this;
  }

  // -- Authentication -----------------------------------------------------

  /** Set the SSH username. */
  username(username: string): this {
    this.params.username = username;
    return this;
  }

  /** Set the SSH password. */
  password(password: string): this {
    this.params.password = password;
    return this;
  }

  /** Set a PEM-encoded private key and optional passphrase. */
  privateKey(key: string, passphrase?: string): this {
    this.params['private-key'] = key;
    if (passphrase) this.params.passphrase = passphrase;
    return this;
  }

  /** Set a Base64-encoded public key for certificate-based authentication. */
  publicKey(key: string): this {
    this.params['public-key'] = key;
    return this;
  }

  /** Set the known host key for the SSH server. */
  hostKey(key: string): this {
    this.params['host-key'] = key;
    return this;
  }

  // -- Display / Terminal -------------------------------------------------

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

  /** Set the font family and optionally the size. */
  font(name: string, size = 12): this {
    this.params['font-name'] = name;
    this.params['font-size'] = size;
    return this;
  }

  /** Set the terminal colour scheme. */
  colorScheme(scheme: TerminalColorScheme): this {
    this.params['color-scheme'] = scheme;
    return this;
  }

  /** Set the scrollback buffer size in lines. */
  scrollback(lines: number): this {
    this.params.scrollback = lines;
    return this;
  }

  // -- Execution ----------------------------------------------------------

  /** Set a command to execute instead of a login shell. */
  command(cmd: string): this {
    this.params.command = cmd;
    return this;
  }

  /** Set the locale for the SSH session. */
  locale(locale: string): this {
    this.params.locale = locale;
    return this;
  }

  /** Set the timezone to forward to the server. */
  timezone(tz: string): this {
    this.params.timezone = tz;
    return this;
  }

  // -- Keepalive ----------------------------------------------------------

  /** Set the SSH keepalive interval in seconds. */
  keepAlive(interval = 30): this {
    this.params['server-alive-interval'] = interval;
    return this;
  }

  // -- SFTP ---------------------------------------------------------------

  /** Enable built-in SFTP file transfer. */
  enableSFTP(rootDir = '/'): this {
    this.params['enable-sftp'] = true;
    this.params['sftp-root-directory'] = rootDir;
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

  // -- Recording ----------------------------------------------------------

  /** Enable server-side session recording. */
  enableRecording(path: string, name?: string): this {
    this.params['recording-path'] = path;
    this.params['recording-name'] = name ?? `ssh-${Date.now()}`;
    this.params['create-recording-path'] = true;
    return this;
  }

  // -- Bulk ---------------------------------------------------------------

  /**
   * Set arbitrary SSH parameters in bulk.
   */
  withParams(params: Partial<Omit<SSHConnectionParams, 'type'>>): this {
    this.params = { ...this.params, ...params };
    return this;
  }

  // -- Validation / Build -------------------------------------------------

  /** @inheritdoc */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.params.hostname) errors.push('hostname is required');
    if (!this.params.username) errors.push('username is required');

    if (!this.params.password && !this.params['private-key'])
      errors.push('Authentication required: provide password or private key');

    const portErr = this.validatePort(this.params.port);
    if (portErr) errors.push(portErr);
    const wErr = this.validatePositive(this.params.width, 'width');
    if (wErr) errors.push(wErr);
    const hErr = this.validatePositive(this.params.height, 'height');
    if (hErr) errors.push(hErr);
    const dErr = this.validatePositive(this.params.dpi, 'dpi');
    if (dErr) errors.push(dErr);

    return { valid: errors.length === 0, errors, warnings };
  }

  /** @inheritdoc */
  build(): ConnectionSettings {
    const v = this.validate();
    if (!v.valid) throw new Error(`Invalid SSH connection: ${v.errors.join(', ')}`);
    return this.toConnectionSettings();
  }
}
