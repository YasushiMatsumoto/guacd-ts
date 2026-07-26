/**
 * VNC connection builder.
 *
 * @packageDocumentation
 */

import type { ConnectionSettings } from '../../types';
import type { VNCConnectionParams, ValidationResult } from '../types';
import { DEFAULT_PORTS } from '../types';
import { BaseConnectionBuilder } from './base';

// ---------------------------------------------------------------------------
// Option interfaces (exported for consumer type-safety)
// ---------------------------------------------------------------------------

/**
 * SFTP file-transfer options for VNC connections.
 *
 * VNC SFTP connects to a separate SSH server — it does not share the VNC
 * session's credentials.  `username` is therefore required.  If `hostname` is
 * omitted, Guacamole uses the VNC server's hostname.
 */
export interface VNCSFTPOptions {
  /** SFTP server hostname. Defaults to the VNC connection hostname. */
  hostname?: string;
  /** SFTP server port (default `22`). */
  port?: number;
  /** SFTP username (required). */
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  publicKey?: string;
  hostKey?: string;
  /** Default upload directory. */
  directory?: string;
  /** Root directory exposed to the SFTP browser. */
  rootDirectory?: string;
  /** SSH keepalive interval in seconds. */
  keepAliveInterval?: number;
  disableDownload?: boolean;
  disableUpload?: boolean;
  /** Connection timeout in seconds. */
  timeout?: number;
}

/** Options for server-side session recording (Guacamole `.guac` format). */
export interface VNCRecordingOptions {
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

/** Options for routing a VNC connection through a UltraVNC repeater. */
export interface VNCRepeaterOptions {
  /** Repeater hostname or IP address. */
  host: string;
  /** Repeater port (default `5900`). */
  port?: number;
}

/** Options for sending a Wake-on-LAN magic packet before connecting. */
export interface VNCWakeOnLanOptions {
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
 * Fluent builder for VNC connections.
 *
 * Multi-parameter features (SFTP, recording, repeater, Wake-on-LAN) use
 * named option objects so call sites are self-documenting and forward-compatible.
 *
 * @example
 * ```ts
 * const settings = new VNCConnectionBuilder()
 *   .hostname('192.168.1.50')
 *   .password('vncpass')
 *   .colorDepth(24)
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

  hostname(hostname: string): this { this.params.hostname = hostname; return this; }
  port(port: number): this { this.params.port = port; return this; }

  // -- Authentication -----------------------------------------------------

  password(password: string): this { this.params.password = password; return this; }
  username(username: string): this { this.params.username = username; return this; }

  // -- Display / Encoding -------------------------------------------------

  width(width: number): this { this.params.width = width; return this; }
  height(height: number): this { this.params.height = height; return this; }
  dpi(dpi: number): this { this.params.dpi = dpi; return this; }

  /** Set cursor rendering mode (`"local"` draws cursor client-side, `"remote"` uses server-side cursor). */
  cursor(mode: 'local' | 'remote'): this { this.params.cursor = mode; return this; }

  colorDepth(depth: 8 | 16 | 24 | 32): this { this.params['color-depth'] = depth; return this; }
  forceLossless(enable = true): this { this.params['force-lossless'] = enable; return this; }

  /** Swap red and blue colour components (fixes colour issues on some servers). */
  swapRedBlue(swap = true): this { this.params['swap-red-blue'] = swap; return this; }

  /** Set the zlib compression level (0 = none, 9 = maximum). */
  compressLevel(level: number): this { this.params['compress-level'] = level; return this; }

  /** Set the JPEG quality level for tight encoding (0 = lowest, 9 = highest). */
  qualityLevel(level: number): this { this.params['quality-level'] = level; return this; }

  /** Disable DesktopSize pseudo-encoding (prevents Guacamole from resizing the remote display). */
  disableDisplayResize(disable = true): this { this.params['disable-display-resize'] = disable; return this; }

  /** Request the VNC server to stop accepting input from other clients. */
  disableServerInput(disable = true): this { this.params['disable-server-input'] = disable; return this; }

  /**
   * Set preferred VNC encodings in priority order.
   *
   * @example
   * ```ts
   * .encodings(['zrle', 'ultra', 'copyrect', 'hextile', 'zlib', 'corre', 'rre', 'raw'])
   * ```
   */
  encodings(list: string[]): this { this.params.encodings = list; return this; }

  // -- Clipboard ----------------------------------------------------------

  readOnly(readOnly = true): this { this.params['read-only'] = readOnly; return this; }
  disableCopy(disable = true): this { this.params['disable-copy'] = disable; return this; }
  disablePaste(disable = true): this { this.params['disable-paste'] = disable; return this; }

  /** Shorthand to disable both clipboard copy and paste. */
  disableClipboard(disable = true): this {
    this.params['disable-copy'] = disable;
    this.params['disable-paste'] = disable;
    return this;
  }

  /**
   * Set the clipboard character encoding used between Guacamole and the VNC
   * server (e.g. `"ISO8859-1"`, `"UTF-8"`).
   */
  clipboardEncoding(enc: string): this { this.params['clipboard-encoding'] = enc; return this; }

  // -- Audio --------------------------------------------------------------

  /** Set the PulseAudio server name (hostname or socket path) for audio support. */
  audioServer(name: string): this { this.params['audio-servername'] = name; return this; }

  // -- Timezone -----------------------------------------------------------

  timezone(tz: string): this { this.params.timezone = tz; return this; }

  // -- Reverse connection -------------------------------------------------

  /**
   * Enable reverse VNC connection (listen mode).
   *
   * In reverse mode Guacamole listens for an incoming VNC connection from the
   * target host rather than initiating one.
   *
   * @param listenTimeoutMs - How long to wait for the incoming connection
   *   (milliseconds, default `5000`).
   */
  reverseConnect(listenTimeoutMs?: number): this {
    this.params['reverse-connect'] = true;
    if (listenTimeoutMs !== undefined) this.params['listen-timeout'] = listenTimeoutMs;
    return this;
  }

  // -- Repeater -----------------------------------------------------------

  /**
   * Route the connection through an UltraVNC repeater.
   *
   * When a repeater is configured, Guacamole connects to the repeater host
   * instead of the VNC server directly; `hostname` / `port` then identify the
   * target inside the repeater.
   */
  repeater(options: VNCRepeaterOptions): this {
    this.params['dest-host'] = options.host;
    if (options.port !== undefined) this.params['dest-port'] = options.port;
    return this;
  }

  // -- Retry --------------------------------------------------------------

  /** Number of automatic reconnection attempts on connection failure. */
  autoRetry(attempts: number): this { this.params.autoretry = attempts; return this; }

  // -- SFTP ---------------------------------------------------------------

  /**
   * Enable SFTP-based file transfer.
   *
   * VNC SFTP connects to a separate SSH server — `username` is required
   * since there are no VNC credentials to borrow.
   */
  sftp(options: VNCSFTPOptions): this {
    this.params['enable-sftp'] = true;
    this.params['sftp-username'] = options.username;
    if (options.hostname) this.params['sftp-hostname'] = options.hostname;
    if (options.port !== undefined) this.params['sftp-port'] = options.port;
    if (options.password) this.params['sftp-password'] = options.password;
    if (options.privateKey) this.params['sftp-private-key'] = options.privateKey;
    if (options.passphrase) this.params['sftp-passphrase'] = options.passphrase;
    if (options.publicKey) this.params['sftp-public-key'] = options.publicKey;
    if (options.hostKey) this.params['sftp-host-key'] = options.hostKey;
    if (options.directory) this.params['sftp-directory'] = options.directory;
    if (options.rootDirectory) this.params['sftp-root-directory'] = options.rootDirectory;
    if (options.keepAliveInterval !== undefined) this.params['sftp-server-alive-interval'] = options.keepAliveInterval;
    if (options.disableDownload !== undefined) this.params['sftp-disable-download'] = options.disableDownload;
    if (options.disableUpload !== undefined) this.params['sftp-disable-upload'] = options.disableUpload;
    if (options.timeout !== undefined) this.params['sftp-timeout'] = options.timeout;
    return this;
  }

  // -- Wake-on-LAN --------------------------------------------------------

  /** Send a Wake-on-LAN magic packet before connecting. */
  wakeOnLan(options: VNCWakeOnLanOptions): this {
    this.params['wol-send-packet'] = true;
    this.params['wol-mac-addr'] = options.macAddr;
    if (options.broadcastAddr) this.params['wol-broadcast-addr'] = options.broadcastAddr;
    if (options.udpPort !== undefined) this.params['wol-udp-port'] = options.udpPort;
    if (options.waitTime !== undefined) this.params['wol-wait-time'] = options.waitTime;
    return this;
  }

  // -- Recording ----------------------------------------------------------

  /** Enable server-side session recording (Guacamole `.guac` binary format). */
  recording(options: VNCRecordingOptions): this {
    this.params['recording-path'] = options.path;
    this.params['recording-name'] = options.name ?? `vnc-${Date.now()}`;
    this.params['create-recording-path'] = options.createPath ?? true;
    if (options.excludeOutput !== undefined) this.params['recording-exclude-output'] = options.excludeOutput;
    if (options.excludeMouse !== undefined) this.params['recording-exclude-mouse'] = options.excludeMouse;
    if (options.includeKeys !== undefined) this.params['recording-include-keys'] = options.includeKeys;
    if (options.writeExisting !== undefined) this.params['recording-write-existing'] = options.writeExisting;
    return this;
  }

  // -- Bulk ---------------------------------------------------------------

  /** Set arbitrary VNC parameters in bulk. */
  withParams(params: Partial<Omit<VNCConnectionParams, 'type'>>): this {
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
    if (p['compress-level'] !== undefined && (p['compress-level'] < 0 || p['compress-level'] > 9))
      errors.push('compressLevel must be between 0 and 9');
    if (p['quality-level'] !== undefined && (p['quality-level'] < 0 || p['quality-level'] > 9))
      errors.push('qualityLevel must be between 0 and 9');

    // -- Feature preconditions ---------------------------------------------
    if (p['wol-send-packet'] && !p['wol-mac-addr'])
      errors.push('wakeOnLan: wol-mac-addr is required when wol-send-packet is enabled');
    if (p['enable-sftp'] && !p['sftp-username'])
      errors.push('sftp: sftp-username is required when enable-sftp is set');

    // -- Auth / credential warnings ----------------------------------------
    if (!p.password && !p.username)
      warnings.push('no authentication credentials provided — server must allow unauthenticated access');

    // -- Reverse connection warnings ----------------------------------------
    if (p['reverse-connect'] && p.hostname)
      warnings.push(
        "reverse-connect is enabled — 'hostname' is ignored; Guacamole listens for an incoming connection instead"
      );

    return { valid: errors.length === 0, errors, warnings };
  }

  build(): ConnectionSettings {
    const v = this.validate();
    if (!v.valid) throw new Error(`Invalid VNC connection: ${v.errors.join(', ')}`);
    return this.toConnectionSettings();
  }
}
