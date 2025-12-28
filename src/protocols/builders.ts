/**
 * Connection builder for RDP protocol
 * Provides type-safe, fluent API for building RDP connections with validation
 */

import {
  RDPConnectionParams,
  VNCConnectionParams,
  SSHConnectionParams,
  TelnetConnectionParams,
  ProtocolConnectionParams,
  ValidationResult,
  DEFAULT_PORTS,
} from './types';
import { ConnectionSettings } from '../types';

/**
 * Base connection builder with common functionality
 */
abstract class BaseConnectionBuilder<T extends ProtocolConnectionParams> {
  // Accumulated params for this builder
  protected params: Partial<T>;

  constructor(type: T['type']) {
    this.params = { type } as Partial<T>;
  }

  /**
   * Build the connection settings
   */
  abstract build(): ConnectionSettings;

  /**
   * Validate the connection parameters
   */
  abstract validate(): ValidationResult;

  /**
   * Convert protocol params to ConnectionSettings format
   */
  protected toConnectionSettings(): ConnectionSettings {
    const settings: Record<string, string | number | boolean | string[]> = {};

    // Convert all params to settings format
    Object.entries(this.params).forEach(([key, value]) => {
      if (key === 'type') return;
      if (value !== undefined && value !== null) {
        settings[key] = value;
      }
    });

    return {
      type: this.params.type,
      settings,
    };
  }
}

/**
 * RDP Connection Builder
 * Fluent API for building RDP connections with validation and smart defaults
 */
export class RDPConnectionBuilder extends BaseConnectionBuilder<RDPConnectionParams> {
  constructor() {
    super('rdp');
    // Set smart defaults
    this.params.port = DEFAULT_PORTS.rdp;
    this.params.security = 'any';
    this.params['ignore-cert'] = true;
    this.params['color-depth'] = 24;
    this.params['enable-wallpaper'] = false;
    this.params['enable-theming'] = false;
    this.params['enable-font-smoothing'] = false;
    this.params['enable-full-window-drag'] = false;
  }

  hostname(hostname: string): this {
    this.params.hostname = hostname;
    return this;
  }

  port(port: number): this {
    this.params.port = port;
    return this;
  }

  username(username: string): this {
    this.params.username = username;
    return this;
  }

  password(password: string): this {
    this.params.password = password;
    return this;
  }

  domain(domain: string): this {
    this.params.domain = domain;
    return this;
  }

  security(security: 'any' | 'nla' | 'tls' | 'rdp' | 'vmconnect'): this {
    this.params.security = security;
    return this;
  }

  ignoreCert(ignore: boolean = true): this {
    this.params['ignore-cert'] = ignore;
    return this;
  }

  colorDepth(depth: 8 | 16 | 24 | 32): this {
    this.params['color-depth'] = depth;
    return this;
  }

  enableDrive(path: string, name: string = 'Shared'): this {
    this.params['enable-drive'] = true;
    this.params['drive-path'] = path;
    this.params['drive-name'] = name;
    this.params['create-drive-path'] = true;
    return this;
  }

  enableAudio(enable: boolean = true): this {
    this.params['enable-audio'] = enable;
    return this;
  }

  enablePrinting(printerName?: string): this {
    this.params['enable-printing'] = true;
    if (printerName) {
      this.params['printer-name'] = printerName;
    }
    return this;
  }

  remoteApp(program: string, args?: string, workDir?: string): this {
    this.params['remote-app'] = program;
    if (args) this.params['remote-app-args'] = args;
    if (workDir) this.params['remote-app-dir'] = workDir;
    return this;
  }

  gateway(hostname: string, username?: string, password?: string, port: number = 443): this {
    this.params['gateway-hostname'] = hostname;
    this.params['gateway-port'] = port;
    if (username) this.params['gateway-username'] = username;
    if (password) this.params['gateway-password'] = password;
    return this;
  }

  readOnly(readOnly: boolean = true): this {
    this.params['read-only'] = readOnly;
    return this;
  }

  disableClipboard(disable: boolean = true): this {
    this.params['disable-copy'] = disable;
    this.params['disable-paste'] = disable;
    return this;
  }

  enableRecording(path: string, name?: string): this {
    this.params['recording-path'] = path;
    this.params['recording-name'] = name || `rdp-${Date.now()}`;
    this.params['create-recording-path'] = true;
    return this;
  }

  performanceFlags(flags: {
    wallpaper?: boolean;
    theming?: boolean;
    fontSmoothing?: boolean;
    fullWindowDrag?: boolean;
  }): this {
    if (flags.wallpaper !== undefined) this.params['enable-wallpaper'] = flags.wallpaper;
    if (flags.theming !== undefined) this.params['enable-theming'] = flags.theming;
    if (flags.fontSmoothing !== undefined)
      this.params['enable-font-smoothing'] = flags.fontSmoothing;
    if (flags.fullWindowDrag !== undefined)
      this.params['enable-full-window-drag'] = flags.fullWindowDrag;
    return this;
  }

  resize(method: 'display-update' | 'reconnect'): this {
    this.params['resize-method'] = method;
    return this;
  }

  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!this.params.hostname) {
      errors.push('hostname is required');
    }
    if (!this.params.username) {
      errors.push('username is required');
    }

    // Port validation
    if (this.params.port && (this.params.port < 1 || this.params.port > 65535)) {
      errors.push('port must be between 1 and 65535');
    }

    // Security warnings
    if (!this.params['ignore-cert'] && !this.params['gateway-hostname']) {
      warnings.push('Certificate validation is enabled but no gateway is configured');
    }

    if (this.params.password && !this.params.username) {
      warnings.push('Password provided without username');
    }
    if (this.params.security === 'nla' && !this.params.password) {
      warnings.push('NLA selected but password is empty; authentication will fail');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  build(): ConnectionSettings {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`Invalid RDP connection: ${validation.errors.join(', ')}`);
    }
    return this.toConnectionSettings();
  }
}

/**
 * VNC Connection Builder
 */
export class VNCConnectionBuilder extends BaseConnectionBuilder<VNCConnectionParams> {
  constructor() {
    super('vnc');
    this.params.port = DEFAULT_PORTS.vnc;
    this.params.cursor = 'remote';
    this.params['color-depth'] = 24;
  }

  hostname(hostname: string): this {
    this.params.hostname = hostname;
    return this;
  }

  port(port: number): this {
    this.params.port = port;
    return this;
  }

  password(password: string): this {
    this.params.password = password;
    return this;
  }

  username(username: string): this {
    this.params.username = username;
    return this;
  }

  cursor(mode: 'local' | 'remote'): this {
    this.params.cursor = mode;
    return this;
  }

  colorDepth(depth: 8 | 16 | 24 | 32): this {
    this.params['color-depth'] = depth;
    return this;
  }

  swapRedBlue(swap: boolean = true): this {
    this.params['swap-red-blue'] = swap;
    return this;
  }

  readOnly(readOnly: boolean = true): this {
    this.params['read-only'] = readOnly;
    return this;
  }

  disableClipboard(disable: boolean = true): this {
    this.params['disable-copy'] = disable;
    this.params['disable-paste'] = disable;
    return this;
  }

  enableSFTP(hostname: string, username: string, password?: string, port: number = 22): this {
    this.params['enable-sftp'] = true;
    this.params['sftp-hostname'] = hostname;
    this.params['sftp-port'] = port;
    this.params['sftp-username'] = username;
    if (password) this.params['sftp-password'] = password;
    return this;
  }

  autoRetry(attempts: number): this {
    this.params.autoretry = attempts;
    return this;
  }

  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.params.hostname) {
      errors.push('hostname is required');
    }

    if (this.params.port && (this.params.port < 1 || this.params.port > 65535)) {
      errors.push('port must be between 1 and 65535');
    }

    if (!this.params.password && !this.params.username) {
      warnings.push('No authentication credentials provided');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  build(): ConnectionSettings {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`Invalid VNC connection: ${validation.errors.join(', ')}`);
    }
    return this.toConnectionSettings();
  }
}

/**
 * SSH Connection Builder
 */
export class SSHConnectionBuilder extends BaseConnectionBuilder<SSHConnectionParams> {
  constructor() {
    super('ssh');
    this.params.port = DEFAULT_PORTS.ssh;
    this.params['font-size'] = 12;
    this.params.scrollback = 1000;
    this.params['server-alive-interval'] = 30;
  }

  hostname(hostname: string): this {
    this.params.hostname = hostname;
    return this;
  }

  port(port: number): this {
    this.params.port = port;
    return this;
  }

  username(username: string): this {
    this.params.username = username;
    return this;
  }

  password(password: string): this {
    this.params.password = password;
    return this;
  }

  privateKey(key: string, passphrase?: string): this {
    this.params['private-key'] = key;
    if (passphrase) this.params.passphrase = passphrase;
    return this;
  }

  font(name: string, size: number = 12): this {
    this.params['font-name'] = name;
    this.params['font-size'] = size;
    return this;
  }

  colorScheme(scheme: string): this {
    this.params['color-scheme'] = scheme;
    return this;
  }

  command(cmd: string): this {
    this.params.command = cmd;
    return this;
  }

  enableSFTP(rootDir: string = '/'): this {
    this.params['enable-sftp'] = true;
    this.params['sftp-root-directory'] = rootDir;
    return this;
  }

  scrollback(lines: number): this {
    this.params.scrollback = lines;
    return this;
  }

  keepAlive(interval: number = 30): this {
    this.params['server-alive-interval'] = interval;
    return this;
  }

  readOnly(readOnly: boolean = true): this {
    this.params['read-only'] = readOnly;
    return this;
  }

  disableClipboard(disable: boolean = true): this {
    this.params['disable-copy'] = disable;
    this.params['disable-paste'] = disable;
    return this;
  }

  enableRecording(path: string, name?: string): this {
    this.params['recording-path'] = path;
    this.params['recording-name'] = name || `ssh-${Date.now()}`;
    this.params['create-recording-path'] = true;
    return this;
  }

  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.params.hostname) {
      errors.push('hostname is required');
    }

    if (this.params.port && (this.params.port < 1 || this.params.port > 65535)) {
      errors.push('port must be between 1 and 65535');
    }

    if (!this.params.username) {
      errors.push('username is required');
    }

    if (!this.params.password && !this.params['private-key']) {
      errors.push('Authentication required: provide password or private key');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  build(): ConnectionSettings {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`Invalid SSH connection: ${validation.errors.join(', ')}`);
    }
    return this.toConnectionSettings();
  }
}

/**
 * Telnet Connection Builder
 */
export class TelnetConnectionBuilder extends BaseConnectionBuilder<TelnetConnectionParams> {
  constructor() {
    super('telnet');
    this.params.port = DEFAULT_PORTS.telnet;
    this.params['font-size'] = 12;
    this.params.scrollback = 1000;
  }

  hostname(hostname: string): this {
    this.params.hostname = hostname;
    return this;
  }

  port(port: number): this {
    this.params.port = port;
    return this;
  }

  username(username: string): this {
    this.params.username = username;
    return this;
  }

  password(password: string): this {
    this.params.password = password;
    return this;
  }

  font(name: string, size: number = 12): this {
    this.params['font-name'] = name;
    this.params['font-size'] = size;
    return this;
  }

  colorScheme(scheme: string): this {
    this.params['color-scheme'] = scheme;
    return this;
  }

  scrollback(lines: number): this {
    this.params.scrollback = lines;
    return this;
  }

  loginRegex(usernameRegex: string, passwordRegex: string): this {
    this.params['username-regex'] = usernameRegex;
    this.params['password-regex'] = passwordRegex;
    return this;
  }

  readOnly(readOnly: boolean = true): this {
    this.params['read-only'] = readOnly;
    return this;
  }

  disableClipboard(disable: boolean = true): this {
    this.params['disable-copy'] = disable;
    this.params['disable-paste'] = disable;
    return this;
  }

  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.params.hostname) {
      errors.push('hostname is required');
    }

    if (this.params.port && (this.params.port < 1 || this.params.port > 65535)) {
      errors.push('port must be between 1 and 65535');
    }

    if (this.params.password && !this.params.username) {
      warnings.push('Password provided without username');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  build(): ConnectionSettings {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`Invalid Telnet connection: ${validation.errors.join(', ')}`);
    }
    return this.toConnectionSettings();
  }
}

/**
 * Factory function to create connection builders
 */
export function createConnectionBuilder(protocol: 'rdp'): RDPConnectionBuilder;
export function createConnectionBuilder(protocol: 'vnc'): VNCConnectionBuilder;
export function createConnectionBuilder(protocol: 'ssh'): SSHConnectionBuilder;
export function createConnectionBuilder(protocol: 'telnet'): TelnetConnectionBuilder;
export function createConnectionBuilder(
  protocol: 'rdp' | 'vnc' | 'ssh' | 'telnet'
): RDPConnectionBuilder | VNCConnectionBuilder | SSHConnectionBuilder | TelnetConnectionBuilder {
  switch (protocol) {
    case 'rdp':
      return new RDPConnectionBuilder();
    case 'vnc':
      return new VNCConnectionBuilder();
    case 'ssh':
      return new SSHConnectionBuilder();
    case 'telnet':
      return new TelnetConnectionBuilder();
    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
}
