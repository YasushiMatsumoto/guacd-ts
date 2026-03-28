/**
 * RDP connection builder.
 *
 * @packageDocumentation
 */

import type { ConnectionSettings } from '../../types';
import type { RDPConnectionParams, ValidationResult } from '../types';
import { DEFAULT_PORTS } from '../types';
import { BaseConnectionBuilder } from './base';

/**
 * Fluent builder for RDP connections with validation and sensible defaults.
 *
 * @example
 * ```ts
 * const settings = new RDPConnectionBuilder()
 *   .hostname('192.168.1.100')
 *   .username('admin')
 *   .password('secret')
 *   .width(1920)
 *   .height(1080)
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

  /** Set the target hostname or IP address. */
  hostname(hostname: string): this {
    this.params.hostname = hostname;
    return this;
  }

  /** Set the target port (default `3389`). */
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

  /** Set the RDP username. */
  username(username: string): this {
    this.params.username = username;
    return this;
  }

  /** Set the RDP password. */
  password(password: string): this {
    this.params.password = password;
    return this;
  }

  /** Set the Windows domain. */
  domain(domain: string): this {
    this.params.domain = domain;
    return this;
  }

  // -- Security -----------------------------------------------------------

  /** Set the security mode. */
  security(security: RDPConnectionParams['security']): this {
    this.params.security = security;
    return this;
  }

  /** Ignore server certificate validation. */
  ignoreCert(ignore = true): this {
    this.params['ignore-cert'] = ignore;
    return this;
  }

  /** Enable Trust On First Use for certificates. */
  certTofu(enable = true): this {
    this.params['cert-tofu'] = enable;
    return this;
  }

  /** Set acceptable certificate SHA-256 fingerprints (comma-separated). */
  certFingerprints(fingerprints: string): this {
    this.params['cert-fingerprints'] = fingerprints;
    return this;
  }

  // -- Display ------------------------------------------------------------

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

  /** Set the resize method upon display size change. */
  resize(method: 'display-update' | 'reconnect'): this {
    this.params['resize-method'] = method;
    return this;
  }

  /** Enable or disable multi-touch input (RDPEI). */
  enableTouch(enable = true): this {
    this.params['enable-touch'] = enable;
    return this;
  }

  // -- Performance --------------------------------------------------------

  /**
   * Configure display performance flags in one call.
   */
  performanceFlags(flags: {
    wallpaper?: boolean;
    theming?: boolean;
    fontSmoothing?: boolean;
    fullWindowDrag?: boolean;
    desktopComposition?: boolean;
    menuAnimations?: boolean;
  }): this {
    if (flags.wallpaper !== undefined) this.params['enable-wallpaper'] = flags.wallpaper;
    if (flags.theming !== undefined) this.params['enable-theming'] = flags.theming;
    if (flags.fontSmoothing !== undefined)
      this.params['enable-font-smoothing'] = flags.fontSmoothing;
    if (flags.fullWindowDrag !== undefined)
      this.params['enable-full-window-drag'] = flags.fullWindowDrag;
    if (flags.desktopComposition !== undefined)
      this.params['enable-desktop-composition'] = flags.desktopComposition;
    if (flags.menuAnimations !== undefined)
      this.params['enable-menu-animations'] = flags.menuAnimations;
    return this;
  }

  // -- Audio --------------------------------------------------------------

  /** Disable audio playback. */
  disableAudio(disable = true): this {
    this.params['disable-audio'] = disable;
    return this;
  }

  /** Enable audio input (microphone). */
  enableAudioInput(enable = true): this {
    this.params['enable-audio-input'] = enable;
    return this;
  }

  // -- Printing -----------------------------------------------------------

  /** Enable printing redirection. */
  enablePrinting(printerName?: string): this {
    this.params['enable-printing'] = true;
    if (printerName) this.params['printer-name'] = printerName;
    return this;
  }

  // -- Drive / File Transfer ----------------------------------------------

  /** Enable RDP native drive redirection. */
  enableDrive(path: string, name = 'Shared'): this {
    this.params['enable-drive'] = true;
    this.params['drive-path'] = path;
    this.params['drive-name'] = name;
    this.params['create-drive-path'] = true;
    return this;
  }

  /**
   * Enable SFTP-based file transfer (RDP + SFTP).
   */
  enableSFTP(hostname: string, username: string, password?: string, port = 22): this {
    this.params['enable-sftp'] = true;
    this.params['sftp-hostname'] = hostname;
    this.params['sftp-port'] = port;
    this.params['sftp-username'] = username;
    if (password) this.params['sftp-password'] = password;
    return this;
  }

  // -- Remote App ---------------------------------------------------------

  /** Configure a RemoteApp session. */
  remoteApp(program: string, args?: string, workDir?: string): this {
    this.params['remote-app'] = program;
    if (args) this.params['remote-app-args'] = args;
    if (workDir) this.params['remote-app-dir'] = workDir;
    return this;
  }

  // -- Gateway ------------------------------------------------------------

  /** Configure RD Gateway settings. */
  gateway(hostname: string, username?: string, password?: string, port = 443): this {
    this.params['gateway-hostname'] = hostname;
    this.params['gateway-port'] = port;
    if (username) this.params['gateway-username'] = username;
    if (password) this.params['gateway-password'] = password;
    return this;
  }

  // -- Input / Clipboard --------------------------------------------------

  /** Enable read-only mode. */
  readOnly(readOnly = true): this {
    this.params['read-only'] = readOnly;
    return this;
  }

  /** Disable both copy and paste. */
  disableClipboard(disable = true): this {
    this.params['disable-copy'] = disable;
    this.params['disable-paste'] = disable;
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

  /** Set clipboard normalization mode. */
  normalizeClipboard(mode: 'preserve' | 'unix' | 'windows'): this {
    this.params['normalize-clipboard'] = mode;
    return this;
  }

  // -- Recording ----------------------------------------------------------

  /** Enable server-side session recording. */
  enableRecording(path: string, name?: string): this {
    this.params['recording-path'] = path;
    this.params['recording-name'] = name ?? `rdp-${Date.now()}`;
    this.params['create-recording-path'] = true;
    return this;
  }

  // -- Bulk ---------------------------------------------------------------

  /**
   * Set arbitrary RDP parameters in bulk.
   *
   * Useful for parameters not yet exposed as dedicated helper methods.
   */
  withParams(params: Partial<Omit<RDPConnectionParams, 'type'>>): this {
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
    if (this.params.security === 'nla' && !this.params.password)
      warnings.push('NLA selected but password is empty; authentication will fail');

    return { valid: errors.length === 0, errors, warnings };
  }

  /** @inheritdoc */
  build(): ConnectionSettings {
    const v = this.validate();
    if (!v.valid) throw new Error(`Invalid RDP connection: ${v.errors.join(', ')}`);
    return this.toConnectionSettings();
  }
}
