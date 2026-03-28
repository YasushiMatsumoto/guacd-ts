import { GuacamoleError, GuacamoleErrorCode } from './base';

/**
 * Generic connection error (wraps unexpected TCP / WebSocket failures).
 */
export class ConnectionError extends GuacamoleError {
  constructor(message: string, cause?: Error) {
    super(message, GuacamoleErrorCode.CONNECTION_ERROR, cause);
    this.name = 'ConnectionError';
  }
}

/**
 * Thrown when the TCP connection to guacd times out.
 */
export class ConnectionTimeoutError extends GuacamoleError {
  constructor(
    /** guacd host that timed out. */
    public readonly host: string,
    /** guacd port that timed out. */
    public readonly port: number,
    /** Timeout duration in milliseconds. */
    public readonly timeoutMs: number,
    cause?: Error
  ) {
    super(
      `Connection to guacd at ${host}:${port} timed out after ${timeoutMs}ms`,
      GuacamoleErrorCode.CONNECTION_TIMEOUT,
      cause
    );
    this.name = 'ConnectionTimeoutError';
  }
}

/**
 * Thrown when the TCP connection to guacd is reset by the remote side.
 */
export class ConnectionResetError extends GuacamoleError {
  constructor(
    public readonly host: string,
    public readonly port: number,
    cause?: Error
  ) {
    super(
      `Connection to guacd at ${host}:${port} was reset`,
      GuacamoleErrorCode.CONNECTION_RESET,
      cause
    );
    this.name = 'ConnectionResetError';
  }
}
