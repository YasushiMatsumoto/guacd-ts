/**
 * Telnet connection builder.
 *
 * @packageDocumentation
 */

import type { ConnectionSettings } from '../../types';
import type { TelnetConnectionParams, TerminalColorScheme, ValidationResult } from '../types';
import { DEFAULT_PORTS } from '../types';
import { BaseConnectionBuilder } from './base';

// ---------------------------------------------------------------------------
// Option interfaces (exported for consumer type-safety)
// ---------------------------------------------------------------------------

/**
 * Regex patterns used for automated Telnet login prompt detection.
 *
 * Guacamole scans terminal output against these patterns to drive
 * credential submission without manual interaction.
 */
export interface TelnetLoginDetectionOptions {
  /** Regex to detect the username prompt (triggers sending `username`). */
  usernameRegex?: string;
  /** Regex to detect the password prompt (triggers sending `password`). */
  passwordRegex?: string;
  /** Regex to detect a successful login (stops further prompt scanning). */
  successRegex?: string;
  /** Regex to detect a failed login (closes the connection with an error). */
  failureRegex?: string;
}

/** Options for server-side session recording (Guacamole `.guac` format). */
export interface TelnetRecordingOptions {
  /** Server-side directory to write the recording file to. */
  path: string;
  /** Recording filename (default auto-generated). */
  name?: string;
  /** Exclude graphical output from the recording. */
  excludeOutput?: boolean;
  /** Exclude mouse events from the recording. */
  excludeMouse?: boolean;
  /** Include key events in the recording. */
  includeKeys?: boolean;
  /** Automatically create the recording directory if it does not exist. */
  createPath?: boolean;
  /** Overwrite an existing recording file. */
  writeExisting?: boolean;
}

/** Options for server-side typescript (text) session logging. */
export interface TelnetTypescriptOptions {
  /** Server-side directory to write the typescript log to. */
  path: string;
  /** Typescript log filename (default auto-generated). */
  name?: string;
  /** Automatically create the typescript directory if it does not exist. */
  createPath?: boolean;
  /** Overwrite an existing typescript file. */
  writeExisting?: boolean;
}

/** Options for sending a Wake-on-LAN magic packet before connecting. */
export interface TelnetWakeOnLanOptions {
  /** MAC address of the target host. */
  macAddr: string;
  /** Broadcast address for the WoL packet (optional). */
  broadcastAddr?: string;
  /** UDP port for the WoL packet (default `9`). */
  udpPort?: number;
  /** Seconds to wait after sending the packet before connecting. */
  waitTime?: number;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Fluent builder for Telnet connections.
 *
 * Multi-parameter features (login detection, recording, typescript,
 * Wake-on-LAN) use named option objects so call sites are self-documenting
 * and forward-compatible.
 *
 * @example
 * ```ts
 * const settings = new TelnetConnectionBuilder()
 *   .hostname('legacy-system')
 *   .username('admin')
 *   .password('secret')
 *   .loginDetection({ usernameRegex: 'login:', passwordRegex: 'password:' })
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

  hostname(hostname: string): this { this.params.hostname = hostname; return this; }
  port(port: number): this { this.params.port = port; return this; }
  timeout(seconds: number): this { this.params.timeout = seconds; return this; }

  // -- Authentication / Auto-login ----------------------------------------

  username(username: string): this { this.params.username = username; return this; }
  password(password: string): this { this.params.password = password; return this; }

  /**
   * Configure automated login by providing regex patterns for prompt detection.
   *
   * At minimum set `usernameRegex` and `passwordRegex` so Guacamole knows
   * when to send the credentials.  Add `successRegex` and/or `failureRegex`
   * to confirm the outcome.
   */
  loginDetection(options: TelnetLoginDetectionOptions): this {
    if (options.usernameRegex !== undefined) this.params['username-regex'] = options.usernameRegex;
    if (options.passwordRegex !== undefined) this.params['password-regex'] = options.passwordRegex;
    if (options.successRegex !== undefined) this.params['login-success-regex'] = options.successRegex;
    if (options.failureRegex !== undefined) this.params['login-failure-regex'] = options.failureRegex;
    return this;
  }

  // -- Display / Terminal -------------------------------------------------

  width(width: number): this { this.params.width = width; return this; }
  height(height: number): this { this.params.height = height; return this; }
  dpi(dpi: number): this { this.params.dpi = dpi; return this; }

  /** Set the terminal font family and optional size (default `12`). */
  font(name: string, size = 12): this {
    this.params['font-name'] = name;
    this.params['font-size'] = size;
    return this;
  }

  colorScheme(scheme: TerminalColorScheme): this { this.params['color-scheme'] = scheme; return this; }
  scrollback(lines: number): this { this.params.scrollback = lines; return this; }

  /**
   * Set the integer codepoint sent when the Backspace key is pressed
   * (e.g. `127` for DEL, `8` for BS).
   */
  backspace(code: number): this { this.params.backspace = code; return this; }

  /** Set the terminal type reported to the server (e.g. `"vt100"`, `"xterm"`). */
  terminalType(type: string): this { this.params['terminal-type'] = type; return this; }

  // -- Execution ----------------------------------------------------------

  locale(locale: string): this { this.params.locale = locale; return this; }
  timezone(tz: string): this { this.params.timezone = tz; return this; }

  // -- Input / Clipboard --------------------------------------------------

  readOnly(readOnly = true): this { this.params['read-only'] = readOnly; return this; }
  disableCopy(disable = true): this { this.params['disable-copy'] = disable; return this; }
  disablePaste(disable = true): this { this.params['disable-paste'] = disable; return this; }

  /** Shorthand to disable both clipboard copy and paste. */
  disableClipboard(disable = true): this {
    this.params['disable-copy'] = disable;
    this.params['disable-paste'] = disable;
    return this;
  }

  /** Normalize clipboard line endings (`"preserve"` | `"unix"` | `"windows"`). */
  normalizeClipboard(mode: 'preserve' | 'unix' | 'windows'): this {
    this.params['normalize-clipboard'] = mode;
    return this;
  }

  // -- Wake-on-LAN --------------------------------------------------------

  /** Send a Wake-on-LAN magic packet before connecting. */
  wakeOnLan(options: TelnetWakeOnLanOptions): this {
    this.params['wol-send-packet'] = true;
    this.params['wol-mac-addr'] = options.macAddr;
    if (options.broadcastAddr) this.params['wol-broadcast-addr'] = options.broadcastAddr;
    if (options.udpPort !== undefined) this.params['wol-udp-port'] = options.udpPort;
    if (options.waitTime !== undefined) this.params['wol-wait-time'] = options.waitTime;
    return this;
  }

  // -- Recording ----------------------------------------------------------

  /** Enable server-side session recording (Guacamole `.guac` binary format). */
  recording(options: TelnetRecordingOptions): this {
    this.params['recording-path'] = options.path;
    this.params['recording-name'] = options.name ?? `telnet-${Date.now()}`;
    this.params['create-recording-path'] = options.createPath ?? true;
    if (options.excludeOutput !== undefined) this.params['recording-exclude-output'] = options.excludeOutput;
    if (options.excludeMouse !== undefined) this.params['recording-exclude-mouse'] = options.excludeMouse;
    if (options.includeKeys !== undefined) this.params['recording-include-keys'] = options.includeKeys;
    if (options.writeExisting !== undefined) this.params['recording-write-existing'] = options.writeExisting;
    return this;
  }

  // -- Typescript (text session log) --------------------------------------

  /**
   * Enable server-side typescript logging (plain-text terminal transcript).
   *
   * Unlike recording (binary `.guac` format), typescript logs are human-readable.
   */
  typescript(options: TelnetTypescriptOptions): this {
    this.params['typescript-path'] = options.path;
    this.params['typescript-name'] = options.name ?? `telnet-${Date.now()}`;
    this.params['create-typescript-path'] = options.createPath ?? true;
    if (options.writeExisting !== undefined) this.params['typescript-write-existing'] = options.writeExisting;
    return this;
  }

  // -- Bulk ---------------------------------------------------------------

  /** Set arbitrary Telnet parameters in bulk. */
  withParams(params: Partial<Omit<TelnetConnectionParams, 'type'>>): this {
    this.params = { ...this.params, ...params };
    return this;
  }

  // -- Validation / Build -------------------------------------------------

  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const p = this.params;

    // -- Required fields ---------------------------------------------------
    if (!p.hostname) errors.push('hostname is required');

    // -- Range checks ------------------------------------------------------
    const portErr = this.validatePort(p.port);
    if (portErr) errors.push(portErr);
    const wErr = this.validatePositive(p.width, 'width');
    if (wErr) errors.push(wErr);
    const hErr = this.validatePositive(p.height, 'height');
    if (hErr) errors.push(hErr);
    const dErr = this.validatePositive(p.dpi, 'dpi');
    if (dErr) errors.push(dErr);

    // -- Feature preconditions ---------------------------------------------
    if (p['wol-send-packet'] && !p['wol-mac-addr'])
      errors.push('wakeOnLan: wol-mac-addr is required when wol-send-packet is enabled');

    // -- Credential / auto-login warnings ----------------------------------
    if (p.password && !p.username)
      warnings.push('password provided without username — auto-login will not work');
    if ((p.username || p.password) && !p['username-regex'] && !p['password-regex'])
      warnings.push(
        'username/password set but no loginDetection regexes configured — credentials will not be sent automatically'
      );
    if ((p['login-success-regex'] || p['login-failure-regex']) && !p['username-regex'])
      warnings.push('success/failure regex configured without usernameRegex — login flow may not trigger correctly');

    return { valid: errors.length === 0, errors, warnings };
  }

  build(): ConnectionSettings {
    const v = this.validate();
    if (!v.valid) throw new Error(`Invalid Telnet connection: ${v.errors.join(', ')}`);
    return this.toConnectionSettings();
  }
}
