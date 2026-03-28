import { GuacamoleError, GuacamoleErrorCode } from './base';

/**
 * Thrown when authentication fails — either via the `onAuthenticate` hook
 * or due to invalid credentials passed to guacd.
 */
export class AuthenticationError extends GuacamoleError {
  constructor(
    /** Short description of why authentication failed. */
    public readonly reason: string,
    cause?: Error
  ) {
    super(`Authentication failed: ${reason}`, GuacamoleErrorCode.AUTHENTICATION_FAILED, cause);
    this.name = 'AuthenticationError';
  }
}
