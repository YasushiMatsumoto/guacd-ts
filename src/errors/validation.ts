import { GuacamoleError, GuacamoleErrorCode } from './base';

/**
 * Thrown when a connection parameter fails a validation rule
 * (e.g. port out of range, required field missing).
 */
export class ValidationError extends GuacamoleError {
  constructor(
    /** The parameter name that failed validation. */
    public readonly field: string,
    /** The value that was rejected (stringified). */
    public readonly value: unknown,
    /** Human-readable description of the constraint that was violated. */
    public readonly constraint: string,
    cause?: Error
  ) {
    super(
      `Validation failed for "${field}": ${constraint}`,
      GuacamoleErrorCode.VALIDATION_ERROR,
      cause
    );
    this.name = 'ValidationError';
  }
}
