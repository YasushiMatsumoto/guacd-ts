/**
 * guacd-ts — WebSocket ↔ guacd bridge library.
 *
 * @packageDocumentation
 */

// -- Server ---------------------------------------------------------------
export { GuacamoleServer } from './server/guacamole-server';
export { ClientConnection } from './server/client-connection';
export { GuacdClient } from './server/guacd-client';
export { TicketManager } from './server/ticket-manager';

// -- Logging --------------------------------------------------------------
export { LogLevel, DefaultLogger, createDefaultLogger, noopLogger } from './logging/logger';
export type { ILogger, DefaultLoggerOptions } from './logging/logger';

// -- Protocol builders & utilities ----------------------------------------
export {
  RDPConnectionBuilder,
  VNCConnectionBuilder,
  SSHConnectionBuilder,
  TelnetConnectionBuilder,
  createConnectionBuilder,
} from './protocols/builders/index';
export { GuacamoleParser } from './protocols/parser';
export {
  detectProtocolFromPort,
  getDefaultPort,
  supportsFileTransfer,
  supportsAudio,
  isTerminalProtocol,
  isGraphicalProtocol,
  getProtocolDisplayName,
  getRecommendedColorDepth,
  parseConnectionString,
} from './protocols/utils';

// -- Protocol types -------------------------------------------------------
export type {
  BaseConnectionParams,
  GraphicalConnectionParams,
  TerminalConnectionParams,
  SFTPParams,
  RDPConnectionParams,
  VNCConnectionParams,
  SSHConnectionParams,
  TelnetConnectionParams,
  ProtocolConnectionParams,
  ValidationResult,
  TerminalColorScheme,
} from './protocols/types';
export { DEFAULT_PORTS } from './protocols/types';

// -- Shared types ---------------------------------------------------------
export type {
  ProtocolType,
  ConnectionSettings,
  ConnectionStats,
  GuacdOptions,
  TicketData,
  TicketStore,
  ConnectionContext,
  ClientConnectionInfo,
  Hooks,
  DefaultConnectionSettings,
  GuacamoleServerOptions,
  IssueTicketOptions,
  IssuedTicket,
  InstructionParts,
} from './types';
export { ConnectionState } from './types';

// -- Errors ---------------------------------------------------------------
export {
  GuacamoleErrorCode,
  GUACAMOLE_STATUS_CODE,
  GuacamoleError,
  TicketNotFoundError,
  TicketExpiredError,
  TicketAlreadyUsedError,
  ConnectionError,
  ConnectionTimeoutError,
  ConnectionResetError,
  HandshakeError,
  InactivityTimeoutError,
  MaxConnectionsError,
  MaxJoinedError,
  AuthenticationError,
  InvalidSessionError,
  ServiceUnavailableError,
  ServiceNotFoundError,
  ValidationError,
} from './errors';
