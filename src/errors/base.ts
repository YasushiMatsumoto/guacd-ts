/**
 * Error codes used to classify Guacamole-related errors.
 *
 * Each code maps to a specific failure category so that consumers can
 * programmatically react to different error scenarios.
 */
export enum GuacamoleErrorCode {
  /** Generic connection-level failure. */
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  /** The guacd service refused the TCP connection. */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** DNS resolution for the guacd host failed. */
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  /** TCP connect to guacd timed out. */
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  /** The TCP connection to guacd was reset by the remote side. */
  CONNECTION_RESET = 'CONNECTION_RESET',
  /** The Guacamole protocol handshake failed. */
  HANDSHAKE_ERROR = 'HANDSHAKE_ERROR',
  /** The connection was closed due to inactivity. */
  INACTIVITY_TIMEOUT = 'INACTIVITY_TIMEOUT',
  /** Authentication (hook or credential) check failed. */
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  /** A referenced ticket was not found. */
  TICKET_NOT_FOUND = 'TICKET_NOT_FOUND',
  /** A referenced ticket has expired before connection. */
  TICKET_EXPIRED = 'TICKET_EXPIRED',
  /** A ticket has already been consumed by another connection. */
  TICKET_ALREADY_USED = 'TICKET_ALREADY_USED',
  /** The supplied session / ticket data is structurally invalid. */
  INVALID_SESSION = 'INVALID_SESSION',
  /** A validation rule on connection parameters was violated. */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Base error class for all guacd-ts errors.
 *
 * Every error carries a {@link GuacamoleErrorCode} so that callers can
 * distinguish error categories with a simple `switch` / `if` on `error.code`
 * **or** by using `instanceof` checks against the more specific subclasses.
 *
 * @example
 * ```ts
 * try {
 *   await server.issueTicket(settings);
 * } catch (err) {
 *   if (err instanceof GuacamoleError) {
 *     console.error(err.code, err.message);
 *   }
 * }
 * ```
 */
export class GuacamoleError extends Error {
  /**
   * @param message  - Human-readable description of the error.
   * @param code     - Machine-readable error category.
   * @param cause    - The underlying error that triggered this one, if any.
   */
  constructor(
    message: string,
    public readonly code: GuacamoleErrorCode,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'GuacamoleError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
