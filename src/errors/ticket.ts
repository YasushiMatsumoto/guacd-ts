import { GuacamoleError, GuacamoleErrorCode } from './base';

/**
 * Thrown when a ticket is not found in the store.
 *
 * @example
 * ```ts
 * if (err instanceof TicketNotFoundError) {
 *   console.log(`Ticket ${err.ticketId} does not exist`);
 * }
 * ```
 */
export class TicketNotFoundError extends GuacamoleError {
  constructor(
    /** The ticket identifier that was looked up. */
    public readonly ticketId: string,
    cause?: Error
  ) {
    super(`Ticket not found: ${ticketId}`, GuacamoleErrorCode.TICKET_NOT_FOUND, cause);
    this.name = 'TicketNotFoundError';
  }
}

/**
 * Thrown when a ticket has expired before a connection was established.
 */
export class TicketExpiredError extends GuacamoleError {
  constructor(
    /** The ticket identifier. */
    public readonly ticketId: string,
    /** ISO-8601 timestamp when the ticket expired. */
    public readonly expiredAt: string,
    cause?: Error
  ) {
    super(
      `Ticket expired: ${ticketId} (expired at ${expiredAt})`,
      GuacamoleErrorCode.TICKET_EXPIRED,
      cause
    );
    this.name = 'TicketExpiredError';
  }
}

/**
 * Thrown when a ticket has already been consumed by another WebSocket
 * connection and cannot be reused.
 */
export class TicketAlreadyUsedError extends GuacamoleError {
  constructor(
    /** The ticket identifier. */
    public readonly ticketId: string,
    cause?: Error
  ) {
    super(`Ticket already used: ${ticketId}`, GuacamoleErrorCode.TICKET_ALREADY_USED, cause);
    this.name = 'TicketAlreadyUsedError';
  }
}
