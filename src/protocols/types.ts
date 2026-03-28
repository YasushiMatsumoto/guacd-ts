/**
 * Protocol-specific type definitions for Guacamole connections.
 *
 * All parameter interfaces are derived from the
 * [Apache Guacamole manual](https://guacamole.apache.org/doc/gug/)
 * and aim for **complete coverage** of each protocol's connection
 * parameters.
 *
 * @packageDocumentation
 */

// ═══════════════════════════════════════════════════════════════════════════
// Shared mixin interfaces
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parameters common to **every** protocol: network target, clipboard
 * control, Wake-on-LAN, and session recording.
 */
export interface BaseConnectionParams {
  /** Remote hostname or IP address. */
  hostname: string;
  /** Remote port (protocol-specific default if omitted). */
  port?: number;

  // -- Clipboard ----------------------------------------------------------
  /** Disable copying from the remote desktop to the client. */
  'disable-copy'?: boolean;
  /** Disable pasting from the client to the remote desktop. */
  'disable-paste'?: boolean;

  // -- Wake-on-LAN -------------------------------------------------------
  /** Send a WoL magic packet before connecting. */
  'wol-send-packet'?: boolean;
  /** MAC address for the WoL packet. */
  'wol-mac-addr'?: string;
  /** Broadcast address for the WoL packet. */
  'wol-broadcast-addr'?: string;
  /** UDP port for the WoL packet (default `9`). */
  'wol-udp-port'?: number;
  /** Time to wait after sending the WoL packet (seconds). */
  'wol-wait-time'?: number;

  // -- Session recording --------------------------------------------------
  /** Server-side directory to write the recording to. */
  'recording-path'?: string;
  /** Filename of the recording. */
  'recording-name'?: string;
  /** Exclude graphical output from the recording. */
  'recording-exclude-output'?: boolean;
  /** Exclude mouse events from the recording. */
  'recording-exclude-mouse'?: boolean;
  /** Include key events in the recording. */
  'recording-include-keys'?: boolean;
  /** Automatically create the recording directory. */
  'create-recording-path'?: boolean;
  /** Overwrite an existing recording file. */
  'recording-write-existing'?: boolean;
}

/**
 * Display-related parameters shared by graphical protocols (RDP, VNC).
 */
export interface GraphicalConnectionParams extends BaseConnectionParams {
  /** Desired display width in pixels. */
  width?: number;
  /** Desired display height in pixels. */
  height?: number;
  /** Display resolution in DPI. */
  dpi?: number;
  /** Color depth: 8, 16, 24, or 32 bits. */
  'color-depth'?: 8 | 16 | 24 | 32;
  /** Force lossless image compression. */
  'force-lossless'?: boolean;
}

/**
 * Terminal-related parameters shared by text protocols (SSH, Telnet).
 */
export interface TerminalConnectionParams extends BaseConnectionParams {
  /** Desired display width in pixels. */
  width?: number;
  /** Desired display height in pixels. */
  height?: number;
  /** Display resolution in DPI. */
  dpi?: number;
  /** Terminal font family. */
  'font-name'?: string;
  /** Terminal font size in points. */
  'font-size'?: number;
  /**
   * Color scheme name or custom definition.
   *
   * Built-in values: `"black-white"`, `"gray-black"`, `"green-black"`,
   * `"white-black"`.  A custom scheme may also be provided as
   * `"foreground-color: …; background-color: …; color1: …; …"`.
   */
  'color-scheme'?: TerminalColorScheme;
  /** Number of rows to keep in the scrollback buffer. */
  scrollback?: number;
  /** Integer codepoint sent when the backspace key is pressed. */
  backspace?: number;
  /** Terminal type string reported to the server. */
  'terminal-type'?: string;
  /** Read-only mode – keyboard input is ignored. */
  'read-only'?: boolean;

  // -- Typescript (text session recording) --------------------------------
  /** Server-side directory for the typescript log. */
  'typescript-path'?: string;
  /** Filename of the typescript log. */
  'typescript-name'?: string;
  /** Automatically create the typescript directory. */
  'create-typescript-path'?: boolean;
  /** Overwrite an existing typescript file. */
  'typescript-write-existing'?: boolean;
}

/**
 * SFTP file-transfer parameters used by protocols that support SFTP
 * (RDP via built-in SFTP, VNC, SSH).
 */
export interface SFTPParams {
  /** Enable SFTP-based file transfer. */
  'enable-sftp'?: boolean;
  /** SFTP server hostname (defaults to the connection hostname). */
  'sftp-hostname'?: string;
  /** SFTP server port (default `22`). */
  'sftp-port'?: number;
  /** Connection timeout for SFTP in seconds. */
  'sftp-timeout'?: number;
  /** Known host key of the SFTP server. */
  'sftp-host-key'?: string;
  /** Username for SFTP authentication. */
  'sftp-username'?: string;
  /** Password for SFTP authentication. */
  'sftp-password'?: string;
  /** Private key for SFTP authentication (PEM-encoded). */
  'sftp-private-key'?: string;
  /** Passphrase for the SFTP private key. */
  'sftp-passphrase'?: string;
  /** Public key for SFTP certificate-based authentication (Base64-encoded). */
  'sftp-public-key'?: string;
  /** Default SFTP upload directory. */
  'sftp-directory'?: string;
  /** Root directory exposed to the SFTP browser. */
  'sftp-root-directory'?: string;
  /** SSH keepalive interval in seconds for the SFTP channel. */
  'sftp-server-alive-interval'?: number;
  /** Disable file downloads through SFTP. */
  'sftp-disable-download'?: boolean;
  /** Disable file uploads through SFTP. */
  'sftp-disable-upload'?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Pre-defined types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Terminal color scheme presets or custom definition.
 */
export type TerminalColorScheme =
  | 'black-white'
  | 'gray-black'
  | 'green-black'
  | 'white-black'
  | (string & {});

// ═══════════════════════════════════════════════════════════════════════════
// RDP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * RDP (Remote Desktop Protocol) connection parameters.
 *
 * @see https://guacamole.apache.org/doc/gug/configuring-guacamole.html#rdp
 */
export interface RDPConnectionParams extends GraphicalConnectionParams, SFTPParams {
  type: 'rdp';

  // -- Authentication -----------------------------------------------------
  /** RDP username. */
  username?: string;
  /** RDP password. */
  password?: string;
  /** Windows domain for authentication. */
  domain?: string;

  // -- Network / Security -------------------------------------------------
  /** Security mode for the connection. */
  security?: 'any' | 'nla' | 'nla-ext' | 'tls' | 'rdp' | 'vmconnect';
  /** Ignore server certificate validation. */
  'ignore-cert'?: boolean;
  /** Trust On First Use — accept unknown certificates once. */
  'cert-tofu'?: boolean;
  /** Comma-separated list of acceptable certificate SHA-256 fingerprints. */
  'cert-fingerprints'?: string;
  /** Disable NLA authentication. */
  'disable-auth'?: boolean;
  /** Connection timeout in seconds. */
  timeout?: number;

  // -- Display / Performance ----------------------------------------------
  /** Disable RemoteFX / GFX pipeline. */
  'disable-gfx'?: boolean;
  /** Enable desktop composition (Aero). */
  'enable-desktop-composition'?: boolean;
  /** Enable menu animations. */
  'enable-menu-animations'?: boolean;
  /** Enable wallpaper rendering. */
  'enable-wallpaper'?: boolean;
  /** Enable theming. */
  'enable-theming'?: boolean;
  /** Enable font smoothing (ClearType). */
  'enable-font-smoothing'?: boolean;
  /** Enable full-window drag. */
  'enable-full-window-drag'?: boolean;
  /** Disable bitmap caching. */
  'disable-bitmap-caching'?: boolean;
  /** Disable off-screen caching. */
  'disable-offscreen-caching'?: boolean;
  /** Disable glyph caching. */
  'disable-glyph-caching'?: boolean;
  /** Resize method upon display size change. */
  'resize-method'?: 'display-update' | 'reconnect';
  /** Read-only – keyboard and mouse input is ignored. */
  'read-only'?: boolean;

  // -- Input --------------------------------------------------------------
  /** Enable multi-touch (RDPEI). */
  'enable-touch'?: boolean;
  /** Server keyboard layout. */
  'server-layout'?: string;
  /** Normalized clipboard handling. */
  'normalize-clipboard'?: 'preserve' | 'unix' | 'windows';

  // -- Audio --------------------------------------------------------------
  /** Disable audio playback. */
  'disable-audio'?: boolean;
  /** Enable audio input (microphone). */
  'enable-audio-input'?: boolean;
  /** Play audio on the server console. */
  'console-audio'?: boolean;

  // -- Printing -----------------------------------------------------------
  /** Enable printing. */
  'enable-printing'?: boolean;
  /** Printer name for redirection. */
  'printer-name'?: string;

  // -- Drive / File Transfer (RDP native) ---------------------------------
  /** Enable drive (file-system) redirection. */
  'enable-drive'?: boolean;
  /** Name of the redirected drive. */
  'drive-name'?: string;
  /** Server-side path for the redirected drive. */
  'drive-path'?: string;
  /** Automatically create the drive path directory. */
  'create-drive-path'?: boolean;
  /** Disable file downloads through the drive. */
  'disable-download'?: boolean;
  /** Disable file uploads through the drive. */
  'disable-upload'?: boolean;

  // -- Remote App ---------------------------------------------------------
  /** RemoteApp program path. */
  'remote-app'?: string;
  /** RemoteApp working directory. */
  'remote-app-dir'?: string;
  /** RemoteApp command-line arguments. */
  'remote-app-args'?: string;

  // -- Gateway ------------------------------------------------------------
  /** RD Gateway hostname. */
  'gateway-hostname'?: string;
  /** RD Gateway port. */
  'gateway-port'?: number;
  /** RD Gateway username. */
  'gateway-username'?: string;
  /** RD Gateway password. */
  'gateway-password'?: string;
  /** RD Gateway domain. */
  'gateway-domain'?: string;

  // -- Load Balancing -----------------------------------------------------
  /** Load balance info token (Hyper-V, RDCB). */
  'load-balance-info'?: string;

  // -- Pre-connection -----------------------------------------------------
  /** Preconnection ID (Hyper-V). */
  'preconnection-id'?: number;
  /** Preconnection BLOB. */
  'preconnection-blob'?: string;

  // -- Session / Console --------------------------------------------------
  /** Connect to the admin/console session. */
  console?: boolean;
  /** Initial program to launch on login. */
  'initial-program'?: string;
  /** Timezone to forward to the server. */
  timezone?: string;
  /** Client name presented to the RDP server. */
  'client-name'?: string;

  // -- Static Channels ----------------------------------------------------
  /** Comma-separated list of static virtual channel names. */
  'static-channels'?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// VNC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * VNC (Virtual Network Computing) connection parameters.
 *
 * @see https://guacamole.apache.org/doc/gug/configuring-guacamole.html#vnc
 */
export interface VNCConnectionParams extends GraphicalConnectionParams, SFTPParams {
  type: 'vnc';

  // -- Authentication -----------------------------------------------------
  /** VNC username (if the server requires one). */
  username?: string;
  /** VNC password. */
  password?: string;

  // -- Display / Encoding -------------------------------------------------
  /** Swap red and blue colour components. */
  'swap-red-blue'?: boolean;
  /** Cursor rendering mode. */
  cursor?: 'local' | 'remote';
  /** Preferred VNC encodings. */
  encodings?: string[];
  /** Read-only — keyboard and mouse input is ignored. */
  'read-only'?: boolean;
  /** Zlib compression level (0–9, used with tight/zlib encoding). */
  'compress-level'?: number;
  /** JPEG quality level (0–9, used with tight encoding). */
  'quality-level'?: number;
  /** Disable display resize requests (DesktopSize pseudo-encoding). */
  'disable-display-resize'?: boolean;
  /** Request the server to stop accepting input from other clients. */
  'disable-server-input'?: boolean;

  // -- Clipboard ----------------------------------------------------------
  /** Clipboard encoding to use (e.g. `"ISO8859-1"`, `"UTF-8"`). */
  'clipboard-encoding'?: string;

  // -- Reverse connection -------------------------------------------------
  /** Enable reverse VNC connection (listen mode). */
  'reverse-connect'?: boolean;
  /** Timeout in milliseconds when waiting for a reverse connection (default `5000`). */
  'listen-timeout'?: number;

  // -- Audio --------------------------------------------------------------
  /** PulseAudio server name for audio support. */
  'audio-servername'?: string;

  // -- Repeater -----------------------------------------------------------
  /** Destination host for VNC repeater. */
  'dest-host'?: string;
  /** Destination port for VNC repeater. */
  'dest-port'?: number;

  // -- Retry --------------------------------------------------------------
  /** Number of times to retry a failed connection. */
  autoretry?: number;

  // -- Timezone -----------------------------------------------------------
  /** Timezone to forward to the server. */
  timezone?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SSH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SSH (Secure Shell) connection parameters.
 *
 * @see https://guacamole.apache.org/doc/gug/configuring-guacamole.html#ssh
 */
export interface SSHConnectionParams extends TerminalConnectionParams, SFTPParams {
  type: 'ssh';

  // -- Authentication -----------------------------------------------------
  /** SSH username. */
  username?: string;
  /** SSH password. */
  password?: string;
  /** Private key for key-based authentication (PEM-encoded). */
  'private-key'?: string;
  /** Passphrase for the private key. */
  passphrase?: string;
  /** Public key for certificate-based authentication (Base64-encoded). */
  'public-key'?: string;
  /** Known host key of the SSH server. */
  'host-key'?: string;

  // -- Network ------------------------------------------------------------
  /** Connection timeout in seconds. */
  timeout?: number;
  /** SSH keepalive interval in seconds. */
  'server-alive-interval'?: number;

  // -- Execution ----------------------------------------------------------
  /** Command to execute instead of a login shell. */
  command?: string;
  /** Locale for the SSH session (e.g. `"en_US.UTF-8"`). */
  locale?: string;
  /** Timezone to forward to the server. */
  timezone?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Telnet
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Telnet connection parameters.
 *
 * @see https://guacamole.apache.org/doc/gug/configuring-guacamole.html#telnet
 */
export interface TelnetConnectionParams extends TerminalConnectionParams {
  type: 'telnet';

  // -- Authentication / Auto-login ----------------------------------------
  /** Telnet username. */
  username?: string;
  /** Telnet password. */
  password?: string;
  /** Regex to detect the username prompt. */
  'username-regex'?: string;
  /** Regex to detect the password prompt. */
  'password-regex'?: string;
  /** Regex to detect a successful login. */
  'login-success-regex'?: string;
  /** Regex to detect a failed login. */
  'login-failure-regex'?: string;

  // -- Network ------------------------------------------------------------
  /** Connection timeout in seconds. */
  timeout?: number;
  /** Locale for the Telnet session. */
  locale?: string;
  /** Timezone to forward to the server. */
  timezone?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Union & utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Discriminated union of all supported protocol parameter types.
 *
 * Use the `type` field to narrow:
 * ```ts
 * if (params.type === 'rdp') {
 *   params.security; // TS knows this is RDPConnectionParams
 * }
 * ```
 */
export type ProtocolConnectionParams =
  | RDPConnectionParams
  | VNCConnectionParams
  | SSHConnectionParams
  | TelnetConnectionParams;

/** Default port numbers for each supported protocol. */
export const DEFAULT_PORTS: Record<string, number> = {
  rdp: 3389,
  vnc: 5900,
  ssh: 22,
  telnet: 23,
};

/** Result of a builder `validate()` call. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
