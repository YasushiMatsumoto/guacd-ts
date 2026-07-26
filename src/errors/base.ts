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
 * Maps each {@link GuacamoleErrorCode} to the numeric status code used in the
 * Guacamole protocol `error` instruction.
 *
 * These values match the `Guacamole.Status.Code` constants defined in
 * guacamole-common-js so that the browser client can interpret them correctly.
 */
export const GUACAMOLE_STATUS_CODE: Readonly<Record<GuacamoleErrorCode, number>> = {
  [GuacamoleErrorCode.CONNECTION_ERROR]: 512,     // SERVER_ERROR     0x0200
  [GuacamoleErrorCode.SERVICE_UNAVAILABLE]: 520,  // UPSTREAM_UNAVAILABLE 0x0208
  [GuacamoleErrorCode.SERVICE_NOT_FOUND]: 519,    // UPSTREAM_NOT_FOUND 0x0207
  [GuacamoleErrorCode.CONNECTION_TIMEOUT]: 514,   // UPSTREAM_TIMEOUT  0x0202
  [GuacamoleErrorCode.CONNECTION_RESET]: 515,     // UPSTREAM_ERROR    0x0203
  [GuacamoleErrorCode.HANDSHAKE_ERROR]: 512,      // SERVER_ERROR      0x0200
  [GuacamoleErrorCode.INACTIVITY_TIMEOUT]: 522,   // SESSION_TIMEOUT   0x020A
  [GuacamoleErrorCode.AUTHENTICATION_FAILED]: 771,// CLIENT_FORBIDDEN  0x0303
  [GuacamoleErrorCode.TICKET_NOT_FOUND]: 769,     // CLIENT_UNAUTHORIZED 0x0301
  [GuacamoleErrorCode.TICKET_EXPIRED]: 769,       // CLIENT_UNAUTHORIZED 0x0301
  [GuacamoleErrorCode.TICKET_ALREADY_USED]: 769,  // CLIENT_UNAUTHORIZED 0x0301
  [GuacamoleErrorCode.INVALID_SESSION]: 769,      // CLIENT_UNAUTHORIZED 0x0301
  [GuacamoleErrorCode.VALIDATION_ERROR]: 768,     // CLIENT_BAD_REQUEST 0x0300
};

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
