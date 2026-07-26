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

/**
 * Thrown when the Guacamole protocol handshake with guacd fails.
 */
export class HandshakeError extends GuacamoleError {
  constructor(message: string, cause?: Error) {
    super(message, GuacamoleErrorCode.HANDSHAKE_ERROR, cause);
    this.name = 'HandshakeError';
  }
}

/**
 * Thrown when the server-wide maximum connection limit is reached.
 */
export class MaxConnectionsError extends GuacamoleError {
  constructor(
    public readonly maxConnections: number
  ) {
    super(
      `Maximum connections reached (${maxConnections})`,
      GuacamoleErrorCode.CONNECTION_ERROR
    );
    this.name = 'MaxConnectionsError';
  }
}

/**
 * Thrown when the per-session participant limit is reached.
 */
export class MaxJoinedError extends GuacamoleError {
  constructor(
    public readonly maxJoinedPerSession: number
  ) {
    super(
      `Maximum participants per session reached (${maxJoinedPerSession})`,
      GuacamoleErrorCode.CONNECTION_ERROR
    );
    this.name = 'MaxJoinedError';
  }
}

/**
 * Thrown when a connection is closed because the client or guacd side has
 * been inactive for longer than the configured timeout.
 */
export class InactivityTimeoutError extends GuacamoleError {
  constructor(
    /** Inactivity duration that triggered the timeout (ms). */
    public readonly idleMs: number,
    cause?: Error
  ) {
    super(`Session terminated due to inactivity (${idleMs}ms)`, GuacamoleErrorCode.INACTIVITY_TIMEOUT, cause);
    this.name = 'InactivityTimeoutError';
  }
}
