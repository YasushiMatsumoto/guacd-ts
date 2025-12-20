/**
 * Protocol-specific type definitions for Guacamole connections
 * Based on Apache Guacamole protocol documentation
 */

/**
 * Common connection parameters shared across all protocols
 */
export interface CommonConnectionParams {
  /** Remote hostname or IP address */
  hostname: string;
  /** Remote port (protocol-specific default if not specified) */
  port?: number;
  /** Enable or disable audio (client-side) */
  'enable-audio'?: boolean;
  /** Enable or disable printing */
  'enable-printing'?: boolean;
  /** Name of printer to use for redirection */
  'printer-name'?: string;
  /** Enable wallpaper rendering */
  'enable-wallpaper'?: boolean;
  /** Enable theming */
  'enable-theming'?: boolean;
  /** Enable font smoothing */
  'enable-font-smoothing'?: boolean;
  /** Enable full window drag */
  'enable-full-window-drag'?: boolean;
  /** Disable bitmap caching */
  'disable-bitmap-caching'?: boolean;
  /** Disable offscreen caching */
  'disable-offscreen-caching'?: boolean;
  /** Disable glyph caching */
  'disable-glyph-caching'?: boolean;
  /** Color depth (8, 16, 24, 32) */
  'color-depth'?: 8 | 16 | 24 | 32;
  /** Force lossless compression */
  'force-lossless'?: boolean;
  /** Recording path for session recording */
  'recording-path'?: string;
  /** Recording name */
  'recording-name'?: string;
  /** Exclude graphics from recording */
  'recording-exclude-output'?: boolean;
  /** Exclude mouse from recording */
  'recording-exclude-mouse'?: boolean;
  /** Include keys in recording */
  'recording-include-keys'?: boolean;
  /** Create recording path automatically */
  'create-recording-path'?: boolean;
  /** Timezone to pass to server */
  timezone?: string;
}

/**
 * RDP (Remote Desktop Protocol) connection parameters
 * For Windows Remote Desktop connections
 */
export interface RDPConnectionParams extends CommonConnectionParams {
  /** Protocol type */
  type: 'rdp';
  /** Username for authentication */
  username?: string;
  /** Password for authentication */
  password?: string;
  /** Windows domain */
  domain?: string;
  /** Security mode: any, nla, tls, rdp, vmconnect */
  security?: 'any' | 'nla' | 'tls' | 'rdp' | 'vmconnect';
  /** Ignore server certificate validation */
  'ignore-cert'?: boolean;
  /** Disable authentication */
  'disable-auth'?: boolean;
  /** Remote app program */
  'remote-app'?: string;
  /** Remote app working directory */
  'remote-app-dir'?: string;
  /** Remote app arguments */
  'remote-app-args'?: string;
  /** Static virtual channels */
  'static-channels'?: string;
  /** Client name to send to server */
  'client-name'?: string;
  /** Console mode (Windows Server 2003) */
  console?: boolean;
  /** Initial program to run */
  'initial-program'?: string;
  /** Server layout (keyboard layout) */
  'server-layout'?: string;
  /** Enable drive redirection */
  'enable-drive'?: boolean;
  /** Drive name */
  'drive-name'?: string;
  /** Drive path */
  'drive-path'?: string;
  /** Create drive path automatically */
  'create-drive-path'?: boolean;
  /** Console audio (play on server) */
  'console-audio'?: boolean;
  /** Disable audio input */
  'disable-audio-input'?: boolean;
  /** Enable audio input */
  'enable-audio-input'?: boolean;
  /** Gateway hostname */
  'gateway-hostname'?: string;
  /** Gateway port */
  'gateway-port'?: number;
  /** Gateway username */
  'gateway-username'?: string;
  /** Gateway password */
  'gateway-password'?: string;
  /** Gateway domain */
  'gateway-domain'?: string;
  /** Load balance info */
  'load-balance-info'?: string;
  /** Preconnection ID */
  'preconnection-id'?: number;
  /** Preconnection BLOB */
  'preconnection-blob'?: string;
  /** Resize method: display-update or reconnect */
  'resize-method'?: 'display-update' | 'reconnect';
  /** Read-only mode */
  'read-only'?: boolean;
  /** Disable clipboard */
  'disable-copy'?: boolean;
  /** Disable paste */
  'disable-paste'?: boolean;
  /** Normalized clipboard */
  'normalize-clipboard'?: 'preserve' | 'unix' | 'windows';
  /** WOL (Wake-on-LAN) settings */
  'wol-send-packet'?: boolean;
  'wol-mac-addr'?: string;
  'wol-broadcast-addr'?: string;
  'wol-udp-port'?: number;
  'wol-wait-time'?: number;
}

/**
 * VNC (Virtual Network Computing) connection parameters
 * For VNC server connections
 */
export interface VNCConnectionParams extends CommonConnectionParams {
  /** Protocol type */
  type: 'vnc';
  /** Username for authentication (if required) */
  username?: string;
  /** Password for authentication */
  password?: string;
  /** Swap red and blue components */
  'swap-red-blue'?: boolean;
  /** Cursor mode: local or remote */
  cursor?: 'local' | 'remote';
  /** Encoding types */
  encodings?: string[];
  /** Read-only mode */
  'read-only'?: boolean;
  /** Disable clipboard */
  'disable-copy'?: boolean;
  /** Disable paste */
  'disable-paste'?: boolean;
  /** Clipboard encoding */
  'clipboard-encoding'?: string;
  /** Destination host (for reverse connections) */
  'dest-host'?: string;
  /** Destination port (for reverse connections) */
  'dest-port'?: number;
  /** Enable SFTP */
  'enable-sftp'?: boolean;
  /** SFTP hostname */
  'sftp-hostname'?: string;
  /** SFTP port */
  'sftp-port'?: number;
  /** SFTP username */
  'sftp-username'?: string;
  /** SFTP password */
  'sftp-password'?: string;
  /** SFTP private key */
  'sftp-private-key'?: string;
  /** SFTP passphrase */
  'sftp-passphrase'?: string;
  /** SFTP root directory */
  'sftp-root-directory'?: string;
  /** SFTP directory */
  'sftp-directory'?: string;
  /** SFTP server alive interval */
  'sftp-server-alive-interval'?: number;
  /** Auto-retry connection */
  autoretry?: number;
  /** Audio server name */
  'audio-servername'?: string;
  /** WOL settings */
  'wol-send-packet'?: boolean;
  'wol-mac-addr'?: string;
  'wol-broadcast-addr'?: string;
  'wol-udp-port'?: number;
  'wol-wait-time'?: number;
}

/**
 * SSH (Secure Shell) connection parameters
 * For SSH terminal connections
 */
export interface SSHConnectionParams {
  /** Protocol type */
  type: 'ssh';
  /** Remote hostname or IP address */
  hostname: string;
  /** SSH port (default: 22) */
  port?: number;
  /** Username for authentication */
  username?: string;
  /** Password for authentication */
  password?: string;
  /** Private key for authentication */
  'private-key'?: string;
  /** Passphrase for private key */
  passphrase?: string;
  /** Host key */
  'host-key'?: string;
  /** Server alive interval (keepalive) */
  'server-alive-interval'?: number;
  /** Enable SFTP */
  'enable-sftp'?: boolean;
  /** SFTP root directory */
  'sftp-root-directory'?: string;
  /** Font name */
  'font-name'?: string;
  /** Font size */
  'font-size'?: number;
  /** Color scheme */
  'color-scheme'?: string;
  /** Terminal type */
  'terminal-type'?: string;
  /** Locale */
  locale?: string;
  /** Timezone */
  timezone?: string;
  /** Read-only mode */
  'read-only'?: boolean;
  /** Disable clipboard */
  'disable-copy'?: boolean;
  /** Disable paste */
  'disable-paste'?: boolean;
  /** Backspace key sends */
  backspace?: number;
  /** Command to execute */
  command?: string;
  /** Scrollback buffer size */
  scrollback?: number;
  /** Recording settings */
  'recording-path'?: string;
  'recording-name'?: string;
  'recording-exclude-output'?: boolean;
  'recording-exclude-mouse'?: boolean;
  'recording-include-keys'?: boolean;
  'create-recording-path'?: boolean;
  /** Typescript settings */
  'typescript-path'?: string;
  'typescript-name'?: string;
  'create-typescript-path'?: boolean;
  /** WOL settings */
  'wol-send-packet'?: boolean;
  'wol-mac-addr'?: string;
  'wol-broadcast-addr'?: string;
  'wol-udp-port'?: number;
  'wol-wait-time'?: number;
}

/**
 * Telnet connection parameters
 * For Telnet terminal connections
 */
export interface TelnetConnectionParams {
  /** Protocol type */
  type: 'telnet';
  /** Remote hostname or IP address */
  hostname: string;
  /** Telnet port (default: 23) */
  port?: number;
  /** Username for login */
  username?: string;
  /** Password for login */
  password?: string;
  /** Username regex (for automated login) */
  'username-regex'?: string;
  /** Password regex (for automated login) */
  'password-regex'?: string;
  /** Login success regex */
  'login-success-regex'?: string;
  /** Login failure regex */
  'login-failure-regex'?: string;
  /** Font name */
  'font-name'?: string;
  /** Font size */
  'font-size'?: number;
  /** Color scheme */
  'color-scheme'?: string;
  /** Terminal type */
  'terminal-type'?: string;
  /** Locale */
  locale?: string;
  /** Timezone */
  timezone?: string;
  /** Read-only mode */
  'read-only'?: boolean;
  /** Disable clipboard */
  'disable-copy'?: boolean;
  /** Disable paste */
  'disable-paste'?: boolean;
  /** Backspace key sends */
  backspace?: number;
  /** Scrollback buffer size */
  scrollback?: number;
  /** Recording settings */
  'recording-path'?: string;
  'recording-name'?: string;
  'recording-exclude-output'?: boolean;
  'recording-exclude-mouse'?: boolean;
  'recording-include-keys'?: boolean;
  'create-recording-path'?: boolean;
  /** Typescript settings */
  'typescript-path'?: string;
  'typescript-name'?: string;
  'create-typescript-path'?: boolean;
  /** WOL settings */
  'wol-send-packet'?: boolean;
  'wol-mac-addr'?: string;
  'wol-broadcast-addr'?: string;
  'wol-udp-port'?: number;
  'wol-wait-time'?: number;
}

/**
 * Kubernetes connection parameters
 * For Kubernetes pod connections
 */
export interface KubernetesConnectionParams {
  /** Protocol type */
  type: 'kubernetes';
  /** Kubernetes API server URL */
  hostname: string;
  /** Kubernetes API port (default: 8080) */
  port?: number;
  /** Namespace */
  namespace?: string;
  /** Pod name */
  pod?: string;
  /** Container name */
  container?: string;
  /** Use SSL/TLS */
  'use-ssl'?: boolean;
  /** CA certificate */
  'ca-cert'?: string;
  /** Client certificate */
  'client-cert'?: string;
  /** Client key */
  'client-key'?: string;
  /** Ignore certificate errors */
  'ignore-cert'?: boolean;
  /** Font name */
  'font-name'?: string;
  /** Font size */
  'font-size'?: number;
  /** Color scheme */
  'color-scheme'?: string;
  /** Scrollback buffer size */
  scrollback?: number;
  /** Read-only mode */
  'read-only'?: boolean;
  /** Disable clipboard */
  'disable-copy'?: boolean;
  /** Disable paste */
  'disable-paste'?: boolean;
  /** Backspace key sends */
  backspace?: number;
  /** Recording settings */
  'recording-path'?: string;
  'recording-name'?: string;
  'recording-exclude-output'?: boolean;
  'recording-exclude-mouse'?: boolean;
  'recording-include-keys'?: boolean;
  'create-recording-path'?: boolean;
  /** Typescript settings */
  'typescript-path'?: string;
  'typescript-name'?: string;
  'create-typescript-path'?: boolean;
}

/**
 * Union type of all protocol-specific parameters
 */
export type ProtocolConnectionParams =
  | RDPConnectionParams
  | VNCConnectionParams
  | SSHConnectionParams
  | TelnetConnectionParams
  | KubernetesConnectionParams;

/**
 * Protocol type literal values
 */
export type ProtocolTypeLiteral = 'rdp' | 'vnc' | 'ssh' | 'telnet' | 'kubernetes';

/**
 * Default port numbers for each protocol
 */
export const DEFAULT_PORTS: Record<ProtocolTypeLiteral, number> = {
  rdp: 3389,
  vnc: 5900,
  ssh: 22,
  telnet: 23,
  kubernetes: 8080,
};

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
