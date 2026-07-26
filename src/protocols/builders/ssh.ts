/**
 * SSH connection builder.
 *
 * @packageDocumentation
 */

import type { ConnectionSettings } from '../../types';
import type { SSHConnectionParams, TerminalColorScheme, ValidationResult } from '../types';
import { DEFAULT_PORTS } from '../types';
import { BaseConnectionBuilder } from './base';

// ---------------------------------------------------------------------------
// Option interfaces (exported for consumer type-safety)
// ---------------------------------------------------------------------------

/** Options for SSH's built-in SFTP file-transfer feature. */
export interface SSHSFTPOptions {
  /** Root directory exposed to the SFTP browser (default `"/"`). */
  rootDirectory?: string;
  /** Prevent file downloads via SFTP. */
  disableDownload?: boolean;
  /** Prevent file uploads via SFTP. */
  disableUpload?: boolean;
}

/** Options for server-side session recording (Guacamole `.guac` format). */
export interface SSHRecordingOptions {
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
export interface SSHTypescriptOptions {
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
export interface SSHWakeOnLanOptions {
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
 * Fluent builder for SSH connections.
 *
 * Multi-parameter features (SFTP, recording, typescript, Wake-on-LAN) use
 * named option objects so call sites are self-documenting and forward-compatible.
 *
 * @example
 * ```ts
 * const settings = new SSHConnectionBuilder()
 *   .hostname('bastion.example.com')
 *   .username('ops')
 *   .privateKey(pemKey, 'passphrase')
 *   .sftp({ rootDirectory: '/uploads' })
 *   .timezone('Asia/Tokyo')
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

  hostname(hostname: string): this { this.params.hostname = hostname; return this; }
  port(port: number): this { this.params.port = port; return this; }
  timeout(seconds: number): this { this.params.timeout = seconds; return this; }

  // -- Authentication -----------------------------------------------------

  username(username: string): this { this.params.username = username; return this; }
  password(password: string): this { this.params.password = password; return this; }

  /** Set a PEM-encoded private key and optional passphrase. */
  privateKey(key: string, passphrase?: string): this {
    this.params['private-key'] = key;
    if (passphrase !== undefined) this.params.passphrase = passphrase;
    return this;
  }

  /** Set a Base64-encoded public key for certificate-based authentication. */
  publicKey(key: string): this { this.params['public-key'] = key; return this; }

  /** Set the known host key of the SSH server (for host verification). */
  hostKey(key: string): this { this.params['host-key'] = key; return this; }

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

  /** Set the terminal type reported to the server (e.g. `"xterm-256color"`). */
  terminalType(type: string): this { this.params['terminal-type'] = type; return this; }

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

  // -- Execution ----------------------------------------------------------

  /** Run a command instead of an interactive login shell. */
  command(cmd: string): this { this.params.command = cmd; return this; }
  locale(locale: string): this { this.params.locale = locale; return this; }
  timezone(tz: string): this { this.params.timezone = tz; return this; }

  // -- Keepalive ----------------------------------------------------------

  /** Set the SSH keepalive interval in seconds (default `30`). */
  keepAlive(interval = 30): this { this.params['server-alive-interval'] = interval; return this; }

  // -- SFTP ---------------------------------------------------------------

  /**
   * Enable the built-in SFTP file browser.
   *
   * SSH SFTP uses the same credentials as the SSH connection itself —
   * no separate authentication is required.
   */
  sftp(options: SSHSFTPOptions = {}): this {
    this.params['enable-sftp'] = true;
    if (options.rootDirectory !== undefined) this.params['sftp-root-directory'] = options.rootDirectory;
    if (options.disableDownload !== undefined) this.params['sftp-disable-download'] = options.disableDownload;
    if (options.disableUpload !== undefined) this.params['sftp-disable-upload'] = options.disableUpload;
    return this;
  }

  // -- Wake-on-LAN --------------------------------------------------------

  /** Send a Wake-on-LAN magic packet before connecting. */
  wakeOnLan(options: SSHWakeOnLanOptions): this {
    this.params['wol-send-packet'] = true;
    this.params['wol-mac-addr'] = options.macAddr;
    if (options.broadcastAddr) this.params['wol-broadcast-addr'] = options.broadcastAddr;
    if (options.udpPort !== undefined) this.params['wol-udp-port'] = options.udpPort;
    if (options.waitTime !== undefined) this.params['wol-wait-time'] = options.waitTime;
    return this;
  }

  // -- Recording ----------------------------------------------------------

  /** Enable server-side session recording (Guacamole `.guac` binary format). */
  recording(options: SSHRecordingOptions): this {
    this.params['recording-path'] = options.path;
    this.params['recording-name'] = options.name ?? `ssh-${Date.now()}`;
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
  typescript(options: SSHTypescriptOptions): this {
    this.params['typescript-path'] = options.path;
    this.params['typescript-name'] = options.name ?? `ssh-${Date.now()}`;
    this.params['create-typescript-path'] = options.createPath ?? true;
    if (options.writeExisting !== undefined) this.params['typescript-write-existing'] = options.writeExisting;
    return this;
  }

  // -- Bulk ---------------------------------------------------------------

  /** Set arbitrary SSH parameters in bulk. */
  withParams(params: Partial<Omit<SSHConnectionParams, 'type'>>): this {
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
    if (!p.username) errors.push('username is required');
    if (!p.password && !p['private-key'])
      errors.push('Authentication required: provide password or private key');

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

    // -- Auth warnings -----------------------------------------------------
    if (p.passphrase && !p['private-key'])
      warnings.push('passphrase provided without private-key — passphrase will be ignored');
    if (p['public-key'] && !p['private-key'])
      warnings.push('public-key (certificate auth) requires a corresponding private-key');
    if (p.password && p['private-key'])
      warnings.push('both password and private-key are set — private-key will be preferred');

    return { valid: errors.length === 0, errors, warnings };
  }

  build(): ConnectionSettings {
    const v = this.validate();
    if (!v.valid) throw new Error(`Invalid SSH connection: ${v.errors.join(', ')}`);
    return this.toConnectionSettings();
  }
}
