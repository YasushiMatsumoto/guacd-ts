/**
 * Telnet connection builder.
 *
 * @packageDocumentation
 */

import type { ConnectionSettings } from '../../types';
import type { TelnetConnectionParams, TerminalColorScheme, ValidationResult } from '../types';
import { DEFAULT_PORTS } from '../types';
import { BaseConnectionBuilder } from './base';

/**
 * Fluent builder for Telnet connections with validation and sensible defaults.
 *
 * @example
 * ```ts
 * const settings = new TelnetConnectionBuilder()
 *   .hostname('192.168.1.5')
 *   .username('admin')
 *   .password('secret')
 *   .build();
 * ```
 */
export class TelnetConnectionBuilder extends BaseConnectionBuilder<TelnetConnectionParams> {
  constructor() {
    super('telnet');
    this.params.port = DEFAULT_PORTS.telnet;
    this.params['font-name'] = 'monospace';
    this.params['font-size'] = 12;
    this.params.scrollback = 1000;
    this.params['color-scheme'] = 'gray-black';
  }

  // -- Network / Target ---------------------------------------------------

  /** Set the target hostname or IP address. */
  hostname(hostname: string): this {
    this.params.hostname = hostname;
    return this;
  }

  /** Set the target port (default `23`). */
  port(port: number): this {
    this.params.port = port;
    return this;
  }

  /** Set the connection timeout in seconds. */
  timeout(seconds: number): this {
    this.params.timeout = seconds;
    return this;
  }

  // -- Authentication / Auto-login ----------------------------------------

  /** Set the Telnet username. */
  username(username: string): this {
    this.params.username = username;
    return this;
  }

  /** Set the Telnet password. */
  password(password: string): this {
    this.params.password = password;
    return this;
  }

  /** Set regex patterns used for automated login prompt detection. */
  loginRegex(usernameRegex: string, passwordRegex: string): this {
    this.params['username-regex'] = usernameRegex;
    this.params['password-regex'] = passwordRegex;
    return this;
  }

  /** Set a regex to detect successful login. */
  loginSuccessRegex(regex: string): this {
    this.params['login-success-regex'] = regex;
    return this;
  }

  /** Set a regex to detect failed login. */
  loginFailureRegex(regex: string): this {
    this.params['login-failure-regex'] = regex;
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

  /** Set the locale for the Telnet session. */
  locale(locale: string): this {
    this.params.locale = locale;
    return this;
  }

  /** Set the timezone to forward to the server. */
  timezone(tz: string): this {
    this.params.timezone = tz;
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
    this.params['recording-name'] = name ?? `telnet-${Date.now()}`;
    this.params['create-recording-path'] = true;
    return this;
  }

  // -- Bulk ---------------------------------------------------------------

  /**
   * Set arbitrary Telnet parameters in bulk.
   */
  withParams(params: Partial<Omit<TelnetConnectionParams, 'type'>>): this {
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
    const wErr = this.validatePositive(this.params.width, 'width');
    if (wErr) errors.push(wErr);
    const hErr = this.validatePositive(this.params.height, 'height');
    if (hErr) errors.push(hErr);
    const dErr = this.validatePositive(this.params.dpi, 'dpi');
    if (dErr) errors.push(dErr);

    if (this.params.password && !this.params.username)
      warnings.push('Password provided without username');

    return { valid: errors.length === 0, errors, warnings };
  }

  /** @inheritdoc */
  build(): ConnectionSettings {
    const v = this.validate();
    if (!v.valid) throw new Error(`Invalid Telnet connection: ${v.errors.join(', ')}`);
    return this.toConnectionSettings();
  }
}
