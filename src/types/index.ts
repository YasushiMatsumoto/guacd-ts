/**
 * Guacamole protocol connection types
 */
export type ProtocolType = 'rdp' | 'vnc' | 'ssh' | 'telnet' | 'kubernetes';

/**
 * Log levels for debugging
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4,
}

/**
 * Connection settings for different protocols
 */
export interface ConnectionSettings {
  type?: ProtocolType;
  join?: string;
  guacdHost?: string;
  guacdPort?: number;
  // Raw guacd args/settings; values must be string/number/boolean or string[]
  settings: Record<string, string | number | boolean | string[]>;
}

/**
 * Logger interface
 */
export interface Logger {
  log(level: LogLevel, message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  verbose(message: string, ...args: unknown[]): void;
}

/**
 * Default connection settings per protocol
 */
export interface DefaultConnectionSettings {
  rdp?: Record<string, string | number | boolean | string[]>;
  vnc?: Record<string, string | number | boolean | string[]>;
  ssh?: Record<string, string | number | boolean | string[]>;
  telnet?: Record<string, string | number | boolean | string[]>;
  kubernetes?: Record<string, string | number | boolean | string[]>;
}

/**
 * Client options configuration
 */
export interface ClientOptions {
  maxInactivityTime?: number;
  log?: {
    level?: LogLevel | string;
    stdLog?: (message: string) => void;
    errorLog?: (message: string) => void;
  };
  // Legacy: kept for backward compatibility, no-op in current implementation
  crypt?: never;
  connectionDefaultSettings?: DefaultConnectionSettings;
  allowedUnencryptedConnectionSettings?: string[];
}

/**
 * guacd connection options
 */
export interface GuacdOptions {
  host?: string;
  port?: number;
}

/**
 * WebSocket server options
 */
export interface WebSocketOptions {
  port?: number;
  server?: unknown;
  [key: string]: unknown;
}

/**
 * Session data stored in registry
 */
export interface SessionData {
  guacdHost: string;
  guacdPort: number;
  connectionInfo: ConnectionSettings;
  createdAt: string;
  expiresAt?: string;
  guacamoleConnectionId?: string;
  sessionId?: string;
  joinedConnections: JoinedConnectionInfo[];
}

/**
 * Information about joined connection
 */
export interface JoinedConnectionInfo {
  connectionId: number;
  guacamoleConnectionId: string;
  joinedAt: string;
  settings?: Record<string, unknown>;
}

/**
 * Session registry interface (Map-like)
 */
export interface SessionRegistry {
  get(sessionId: string): Promise<SessionData | null> | SessionData | null;
  set(sessionId: string, data: SessionData): Promise<void> | void;
  delete(sessionId: string): Promise<void> | void;
}

/**
 * Callback for processing connection settings
 */
export type ProcessConnectionSettingsCallback = (
  settings: Record<string, unknown>,
  callback: (error: Error | undefined, settings?: Record<string, unknown>) => void
) => void;

/**
 * Callback for validating cookies before connection
 */
export type ValidateCookiesCallback = (
  cookies: Record<string, string>,
  callback: (error: Error | undefined, isValid?: boolean) => void
) => void;

/**
 * Callbacks configuration
 */
export interface Callbacks {
  processConnectionSettings?: ProcessConnectionSettingsCallback;
  validateCookies?: ValidateCookiesCallback;
  sessionRegistry?: SessionRegistry;
}

/**
 * Guacamole instruction parts
 */
export type InstructionParts = [string, ...string[]];

/**
 * Connection state
 */
export enum ConnectionState {
  OPENING = 'opening',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
}

/**
 * Error codes
 */
export enum GuacamoleErrorCode {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_RESET = 'CONNECTION_RESET',
  HANDSHAKE_ERROR = 'HANDSHAKE_ERROR',
  INACTIVITY_TIMEOUT = 'INACTIVITY_TIMEOUT',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  INVALID_SESSION = 'INVALID_SESSION',
}

/**
 * Guacamole error
 */
export class GuacamoleError extends Error {
  constructor(
    message: string,
    public code: GuacamoleErrorCode,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'GuacamoleError';
    Object.setPrototypeOf(this, GuacamoleError.prototype);
  }
}

/**
 * Connection event types
 */
export interface ConnectionEvents {
  ready: (connection: unknown) => void;
  close: (connection: unknown, error?: Error) => void;
  error: (connection: unknown, error: Error) => void;
  data: (data: string) => void;
}

/**
 * Server event types
 */
export interface ServerEvents {
  open: (connection: unknown) => void;
  close: (connection: unknown, error?: Error) => void;
  error: (connection: unknown, error: Error) => void;
}
