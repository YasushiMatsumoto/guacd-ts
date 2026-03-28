import { GuacamoleError, GuacamoleErrorCode } from './base';

/**
 * Thrown when session / ticket data is structurally invalid
 * (e.g. missing required fields, wrong types).
 */
export class InvalidSessionError extends GuacamoleError {
  constructor(message: string, cause?: Error) {
    super(message, GuacamoleErrorCode.INVALID_SESSION, cause);
    this.name = 'InvalidSessionError';
  }
}
