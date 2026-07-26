/**
 * RDP connection builder.
 *
 * @packageDocumentation
 */

import type { ConnectionSettings } from '../../types';
import type { RDPConnectionParams, ValidationResult } from '../types';
import { DEFAULT_PORTS } from '../types';
import { BaseConnectionBuilder } from './base';

// ---------------------------------------------------------------------------
// Option interfaces (exported for consumer type-safety)
// ---------------------------------------------------------------------------

export interface RDPGatewayOptions {
  hostname: string;
  port?: number;
  username?: string;
  password?: string;
  domain?: string;
}

export interface RDPDriveOptions {
  path: string;
  name?: string;
  createPath?: boolean;
  disableDownload?: boolean;
  disableUpload?: boolean;
}

export interface RDPSFTPOptions {
  /** SFTP server hostname. Defaults to the RDP connection hostname. */
  hostname?: string;
  /** SFTP server port. Default `22`. */
  port?: number;
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

export interface RDPRemoteAppOptions {
  program: string;
  args?: string;
  workDir?: string;
}

export interface RDPPreconnectionOptions {
  id?: number;
  blob?: string;
}

export interface RDPWakeOnLanOptions {
  macAddr: string;
  broadcastAddr?: string;
  /** UDP port for the WoL packet. Default `9`. */
  udpPort?: number;
  /** Seconds to wait after sending the packet. */
  waitTime?: number;
}

export interface RDPRecordingOptions {
  path: string;
  name?: string;
  excludeOutput?: boolean;
  excludeMouse?: boolean;
  includeKeys?: boolean;
  createPath?: boolean;
  writeExisting?: boolean;
}

export interface RDPPerformanceFlags {
  wallpaper?: boolean;
  theming?: boolean;
  fontSmoothing?: boolean;
  fullWindowDrag?: boolean;
  desktopComposition?: boolean;
  menuAnimations?: boolean;
  disableGfx?: boolean;
  disableBitmapCaching?: boolean;
  disableOffscreenCaching?: boolean;
  disableGlyphCaching?: boolean;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Fluent builder for RDP connections.
 *
 * Multi-parameter features (gateway, drive, SFTP, RemoteApp, recording,
 * Wake-on-LAN, preconnection) use named option objects so call sites are
 * self-documenting and forward-compatible.
 *
 * @example
 * ```ts
 * const settings = new RDPConnectionBuilder()
 *   .hostname('192.168.1.100')
 *   .username('admin')
 *   .password('secret')
 *   .security('nla')
 *   .width(1920).height(1080)
 *   .timezone('Asia/Tokyo')
 *   .build();
 * ```
 */
export class RDPConnectionBuilder extends BaseConnectionBuilder<RDPConnectionParams> {
  constructor() {
    super('rdp');
    this.params.port = DEFAULT_PORTS.rdp;
    this.params.security = 'any';
    this.params['ignore-cert'] = true;
    this.params['color-depth'] = 24;
    this.params['enable-wallpaper'] = false;
    this.params['enable-theming'] = false;
    this.params['enable-font-smoothing'] = false;
    this.params['enable-full-window-drag'] = false;
  }

  // -- Network / Target ---------------------------------------------------

  hostname(hostname: string): this { this.params.hostname = hostname; return this; }
  port(port: number): this { this.params.port = port; return this; }
  timeout(seconds: number): this { this.params.timeout = seconds; return this; }

  // -- Authentication -----------------------------------------------------

  username(username: string): this { this.params.username = username; return this; }
  password(password: string): this { this.params.password = password; return this; }
  domain(domain: string): this { this.params.domain = domain; return this; }
  /** Disable NLA pre-authentication (`disable-auth`). */
  disableAuth(disable = true): this { this.params['disable-auth'] = disable; return this; }

  // -- Security -----------------------------------------------------------

  security(security: RDPConnectionParams['security']): this { this.params.security = security; return this; }
  ignoreCert(ignore = true): this { this.params['ignore-cert'] = ignore; return this; }
  certTofu(enable = true): this { this.params['cert-tofu'] = enable; return this; }
  certFingerprints(fingerprints: string): this { this.params['cert-fingerprints'] = fingerprints; return this; }

  // -- Display ------------------------------------------------------------

  width(width: number): this { this.params.width = width; return this; }
  height(height: number): this { this.params.height = height; return this; }
  dpi(dpi: number): this { this.params.dpi = dpi; return this; }
  colorDepth(depth: 8 | 16 | 24 | 32): this { this.params['color-depth'] = depth; return this; }
  forceLossless(enable = true): this { this.params['force-lossless'] = enable; return this; }
  resizeMethod(method: 'display-update' | 'reconnect'): this { this.params['resize-method'] = method; return this; }
  enableTouch(enable = true): this { this.params['enable-touch'] = enable; return this; }

  // -- Performance --------------------------------------------------------

  performanceFlags(flags: RDPPerformanceFlags): this {
    if (flags.wallpaper !== undefined) this.params['enable-wallpaper'] = flags.wallpaper;
    if (flags.theming !== undefined) this.params['enable-theming'] = flags.theming;
    if (flags.fontSmoothing !== undefined) this.params['enable-font-smoothing'] = flags.fontSmoothing;
    if (flags.fullWindowDrag !== undefined) this.params['enable-full-window-drag'] = flags.fullWindowDrag;
    if (flags.desktopComposition !== undefined) this.params['enable-desktop-composition'] = flags.desktopComposition;
    if (flags.menuAnimations !== undefined) this.params['enable-menu-animations'] = flags.menuAnimations;
    if (flags.disableGfx !== undefined) this.params['disable-gfx'] = flags.disableGfx;
    if (flags.disableBitmapCaching !== undefined) this.params['disable-bitmap-caching'] = flags.disableBitmapCaching;
    if (flags.disableOffscreenCaching !== undefined) this.params['disable-offscreen-caching'] = flags.disableOffscreenCaching;
    if (flags.disableGlyphCaching !== undefined) this.params['disable-glyph-caching'] = flags.disableGlyphCaching;
    return this;
  }

  // -- Audio --------------------------------------------------------------

  disableAudio(disable = true): this { this.params['disable-audio'] = disable; return this; }
  enableAudioInput(enable = true): this { this.params['enable-audio-input'] = enable; return this; }
  /** Redirect audio to the server console session (`console-audio`). */
  consoleAudio(enable = true): this { this.params['console-audio'] = enable; return this; }

  // -- Input / Clipboard --------------------------------------------------

  readOnly(readOnly = true): this { this.params['read-only'] = readOnly; return this; }
  /** Set the keyboard layout of the remote server (e.g. `"en-us-qwerty"`). */
  serverLayout(layout: string): this { this.params['server-layout'] = layout; return this; }
  disableCopy(disable = true): this { this.params['disable-copy'] = disable; return this; }
  disablePaste(disable = true): this { this.params['disable-paste'] = disable; return this; }
  disableClipboard(disable = true): this {
    this.params['disable-copy'] = disable;
    this.params['disable-paste'] = disable;
    return this;
  }
  normalizeClipboard(mode: 'preserve' | 'unix' | 'windows'): this {
    this.params['normalize-clipboard'] = mode;
    return this;
  }

  // -- Printing -----------------------------------------------------------

  enablePrinting(printerName?: string): this {
    this.params['enable-printing'] = true;
    if (printerName) this.params['printer-name'] = printerName;
    return this;
  }

  // -- Drive (RDP native file-system redirection) -------------------------

  drive(options: RDPDriveOptions): this {
    this.params['enable-drive'] = true;
    this.params['drive-path'] = options.path;
    this.params['drive-name'] = options.name ?? 'Shared';
    this.params['create-drive-path'] = options.createPath ?? true;
    if (options.disableDownload !== undefined) this.params['disable-download'] = options.disableDownload;
    if (options.disableUpload !== undefined) this.params['disable-upload'] = options.disableUpload;
    return this;
  }

  // -- SFTP ---------------------------------------------------------------

  sftp(options: RDPSFTPOptions): this {
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

  // -- Remote App ---------------------------------------------------------

  remoteApp(options: RDPRemoteAppOptions): this {
    this.params['remote-app'] = options.program;
    if (options.args) this.params['remote-app-args'] = options.args;
    if (options.workDir) this.params['remote-app-dir'] = options.workDir;
    return this;
  }

  // -- Gateway ------------------------------------------------------------

  gateway(options: RDPGatewayOptions): this {
    this.params['gateway-hostname'] = options.hostname;
    this.params['gateway-port'] = options.port ?? 443;
    if (options.username) this.params['gateway-username'] = options.username;
    if (options.password) this.params['gateway-password'] = options.password;
    if (options.domain) this.params['gateway-domain'] = options.domain;
    return this;
  }

  // -- Load Balancing / Preconnection ------------------------------------

  loadBalanceInfo(token: string): this { this.params['load-balance-info'] = token; return this; }

  preconnection(options: RDPPreconnectionOptions): this {
    if (options.id !== undefined) this.params['preconnection-id'] = options.id;
    if (options.blob) this.params['preconnection-blob'] = options.blob;
    return this;
  }

  // -- Session / Console --------------------------------------------------

  /** Connect to the RDP console/admin session. */
  adminConsole(enable = true): this { this.params.console = enable; return this; }
  initialProgram(program: string): this { this.params['initial-program'] = program; return this; }
  timezone(tz: string): this { this.params.timezone = tz; return this; }
  clientName(name: string): this { this.params['client-name'] = name; return this; }
  /** Comma-separated list of static virtual channel names. */
  staticChannels(channels: string | string[]): this {
    this.params['static-channels'] = Array.isArray(channels) ? channels.join(',') : channels;
    return this;
  }

  // -- Wake-on-LAN --------------------------------------------------------

  wakeOnLan(options: RDPWakeOnLanOptions): this {
    this.params['wol-send-packet'] = true;
    this.params['wol-mac-addr'] = options.macAddr;
    if (options.broadcastAddr) this.params['wol-broadcast-addr'] = options.broadcastAddr;
    if (options.udpPort !== undefined) this.params['wol-udp-port'] = options.udpPort;
    if (options.waitTime !== undefined) this.params['wol-wait-time'] = options.waitTime;
    return this;
  }

  // -- Recording ----------------------------------------------------------

  recording(options: RDPRecordingOptions): this {
    this.params['recording-path'] = options.path;
    this.params['recording-name'] = options.name ?? `rdp-${Date.now()}`;
    this.params['create-recording-path'] = options.createPath ?? true;
    if (options.excludeOutput !== undefined) this.params['recording-exclude-output'] = options.excludeOutput;
    if (options.excludeMouse !== undefined) this.params['recording-exclude-mouse'] = options.excludeMouse;
    if (options.includeKeys !== undefined) this.params['recording-include-keys'] = options.includeKeys;
    if (options.writeExisting !== undefined) this.params['recording-write-existing'] = options.writeExisting;
    return this;
  }

  // -- Bulk fallback ------------------------------------------------------

  /**
   * Set arbitrary RDP parameters in bulk.
   *
   * Useful for parameters not yet exposed as dedicated helper methods, or
   * for forwarding a plain config object from external sources.
   */
  withParams(params: Partial<Omit<RDPConnectionParams, 'type'>>): this {
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

    // -- Range checks ------------------------------------------------------
    const portErr = this.validatePort(p.port);
    if (portErr) errors.push(portErr);
    const wErr = this.validatePositive(p.width, 'width');
    if (wErr) errors.push(wErr);
    const hErr = this.validatePositive(p.height, 'height');
    if (hErr) errors.push(hErr);
    const dErr = this.validatePositive(p.dpi, 'dpi');
    if (dErr) errors.push(dErr);

    // -- Feature preconditions (missing required sub-fields) ---------------
    if (p['wol-send-packet'] && !p['wol-mac-addr'])
      errors.push('wakeOnLan: wol-mac-addr is required when wol-send-packet is enabled');
    if (p['enable-drive'] && !p['drive-path'])
      errors.push('drive: drive-path is required when enable-drive is set');
    if (p['enable-sftp'] && !p['sftp-username'])
      errors.push('sftp: sftp-username is required when enable-sftp is set');

    // -- Credential warnings -----------------------------------------------
    if (p.password && !p.username)
      warnings.push('password provided without username');
    if (p.security === 'nla' && !p.password)
      warnings.push('NLA selected but password is empty — authentication will likely fail');

    // -- Security / certificate contradictions -----------------------------
    if (p.security === 'rdp')
      warnings.push("security='rdp' uses legacy NTLMv1 — prefer 'nla' or 'tls' for production");
    if (p['ignore-cert'] && p['cert-fingerprints'])
      warnings.push('ignore-cert is true but cert-fingerprints is also set — fingerprints will have no effect');
    if (p['ignore-cert'] && p['cert-tofu'])
      warnings.push('ignore-cert is true but cert-tofu is also set — cert-tofu will have no effect');

    // -- Mutually exclusive feature combinations ---------------------------
    if (p['remote-app'] && p.console)
      warnings.push('remote-app and console (admin session) are mutually exclusive — remote-app will be ignored');

    // -- Flag applicability ------------------------------------------------
    if (p['disable-auth'] && p.security !== 'nla')
      warnings.push("disable-auth only applies when security='nla' — it will be ignored with the current security setting");

    return { valid: errors.length === 0, errors, warnings };
  }

  build(): ConnectionSettings {
    const v = this.validate();
    if (!v.valid) throw new Error(`Invalid RDP connection: ${v.errors.join(', ')}`);
    return this.toConnectionSettings();
  }
}
