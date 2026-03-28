import { GuacamoleError, GuacamoleErrorCode } from './base';

/**
 * Thrown when guacd refused the connection (ECONNREFUSED).
 */
export class ServiceUnavailableError extends GuacamoleError {
  constructor(
    public readonly host: string,
    public readonly port: number,
    cause?: Error
  ) {
    super(
      `guacd service unavailable at ${host}:${port}`,
      GuacamoleErrorCode.SERVICE_UNAVAILABLE,
      cause
    );
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Thrown when DNS resolution for the guacd host fails (ENOTFOUND).
 */
export class ServiceNotFoundError extends GuacamoleError {
  constructor(
    public readonly host: string,
    cause?: Error
  ) {
    super(`guacd host not found: ${host}`, GuacamoleErrorCode.SERVICE_NOT_FOUND, cause);
    this.name = 'ServiceNotFoundError';
  }
}
