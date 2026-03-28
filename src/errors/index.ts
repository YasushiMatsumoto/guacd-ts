/**
 * Custom error hierarchy for guacd-ts.
 *
 * All errors extend {@link GuacamoleError} so consumers can catch the
 * base class or use `instanceof` checks for finer-grained handling.
 *
 * @packageDocumentation
 */

// Base
export { GuacamoleError, GuacamoleErrorCode } from './base';

// Ticket lifecycle
export { TicketNotFoundError, TicketExpiredError, TicketAlreadyUsedError } from './ticket';

// Connection / transport
export { ConnectionError, ConnectionTimeoutError, ConnectionResetError } from './connection';

// Authentication
export { AuthenticationError } from './authentication';

// Session / ticket data integrity
export { InvalidSessionError } from './session';

// guacd service reachability
export { ServiceUnavailableError, ServiceNotFoundError } from './service';

// Parameter validation
export { ValidationError } from './validation';
