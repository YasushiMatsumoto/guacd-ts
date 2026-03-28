/**
 * Shared type definitions for guacd-ts.
 *
 * @packageDocumentation
 */

import type http from 'http';
import type { ILogger } from '../logging/logger';

// ---------------------------------------------------------------------------
// Protocol
// ---------------------------------------------------------------------------

/** Supported Guacamole remote-desktop protocol identifiers. */
export type ProtocolType = 'rdp' | 'vnc' | 'ssh' | 'telnet';

// ---------------------------------------------------------------------------
// Connection settings
// ---------------------------------------------------------------------------

/**
 * Describes the target protocol and the key/value parameters that will be
 * forwarded to guacd during the Guacamole handshake.
 */
export interface ConnectionSettings {
  /** Protocol to use for the remote session. */
  type: ProtocolType;
  /**
   * An existing Guacamole connection ID to join (screen-sharing).
   * When set, `type` and `settings` are taken from the original session.
   */
  join?: string;
  /** Protocol parameter bag sent to guacd during the handshake. */
  settings: Record<string, string | number | boolean | string[]>;
}

// ---------------------------------------------------------------------------
// guacd daemon connection
// ---------------------------------------------------------------------------

/** Connection parameters for the guacd daemon itself. */
export interface GuacdOptions {
  /** guacd hostname or IP address (default `"127.0.0.1"`). */
  host?: string;
  /** guacd TCP port (default `4822`). */
  port?: number;
}

// ---------------------------------------------------------------------------
// Ticket store
// ---------------------------------------------------------------------------

/** Persistent data associated with an issued ticket. */
export interface TicketData {
  /** Unique ticket identifier. */
  ticketId: string;
  /** Connection settings that will be forwarded to guacd. */
  connectionSettings: ConnectionSettings;
  /** ISO-8601 timestamp when the ticket was created. */
  createdAt: string;
  /** ISO-8601 timestamp when the *ticket itself* expires (pre-connection TTL). */
  ticketExpiresAt: string;
  /** Maximum connection lifetime in ms (`0` = unlimited). */
  connectionTtlMs: number;
  /** ISO-8601 timestamp if the ticket has been consumed, otherwise `undefined`. */
  consumedAt?: string;
  /** Optional guacd override for this specific ticket. */
  guacdOptions?: GuacdOptions;
}

/**
 * Storage back-end for tickets.
 *
 * The default implementation uses an in-memory `Map`.  Implement this
 * interface to back tickets with Redis, a database, or any other store.
 * All methods may return a `Promise` for async stores.
 */
export interface TicketStore {
  /** Retrieve a ticket by its ID, or `null` if not found. */
  get(ticketId: string): Promise<TicketData | null> | TicketData | null;
  /** Persist a ticket. */
  set(ticketId: string, data: TicketData): Promise<void> | void;
  /** Remove a ticket from the store. */
  delete(ticketId: string): Promise<void> | void;
}

// ---------------------------------------------------------------------------
// Connection context & hooks
// ---------------------------------------------------------------------------

/**
 * Contextual data available to every hook invocation.
 *
 * Provides full access to the original HTTP upgrade request so hooks can
 * inspect headers, cookies, client IP, etc.
 */
export interface ConnectionContext {
  /** Ticket ID extracted from the WebSocket URL. */
  ticketId: string;
  /** The raw HTTP upgrade request (headers, cookies, IP, …). */
  request: http.IncomingMessage;
  /** Connection settings associated with the ticket. */
  connectionSettings: ConnectionSettings;
  /** Parsed query-string parameters from the upgrade URL. */
  query: Record<string, string>;
}

// Forward reference — the concrete type is defined in `server/client-connection.ts`.
// Using an interface here avoids circular imports.
/** Minimal shape of a live client connection visible to hooks. */
export interface ClientConnectionInfo {
  /** Unique connection identifier assigned by the server. */
  connectionId: number;
  /** The ticket ID this connection originated from. */
  ticketId: string;
  /** guacd-assigned connection ID (e.g. `"$abcdef-1234"`). */
  guacamoleConnectionId?: string;
}

/**
 * Lifecycle hooks that can be supplied when creating a
 * {@link GuacamoleServerOptions | GuacamoleServer}.
 *
 * All hooks are optional and may be `async`.
 */
export interface Hooks {
  /**
   * Called **before** a connection to guacd is established.
   *
   * Throw to reject the connection.
   */
  onBeforeConnect?(context: ConnectionContext): Promise<void> | void;

  /**
   * Called to authenticate the connecting client.
   *
   * Return `true` to allow, `false` or throw to reject.
   * If omitted, all connections are allowed.
   */
  onAuthenticate?(context: ConnectionContext): Promise<boolean> | boolean;

  /** Called once the WebSocket ↔ guacd tunnel is fully established. */
  onConnect?(connection: ClientConnectionInfo): void;

  /** Called when a connection is closed (cleanly or otherwise). */
  onDisconnect?(connection: ClientConnectionInfo, reason?: string): void;

  /** Called when an error occurs on an active connection. */
  onError?(connection: ClientConnectionInfo, error: Error): void;
}

// ---------------------------------------------------------------------------
// Default connection settings (per-protocol overrides)
// ---------------------------------------------------------------------------

/**
 * Per-protocol default parameter values merged into every connection of that
 * type before the handshake.
 */
export interface DefaultConnectionSettings {
  rdp?: Record<string, string | number | boolean | string[]>;
  vnc?: Record<string, string | number | boolean | string[]>;
  ssh?: Record<string, string | number | boolean | string[]>;
  telnet?: Record<string, string | number | boolean | string[]>;
}

// ---------------------------------------------------------------------------
// Server options
// ---------------------------------------------------------------------------

/** Options for {@link GuacamoleServer} construction. */
export interface GuacamoleServerOptions {
  /** Default guacd daemon connection settings. */
  guacd?: GuacdOptions;

  /** Lifecycle hooks. */
  hooks?: Hooks;

  /**
   * Logger instance.  When omitted a {@link DefaultLogger} at `INFO`
   * level is created automatically.
   */
  logger?: ILogger;

  /**
   * Log configuration used when no custom `logger` is provided.
   * Ignored if `logger` is set.
   */
  log?: {
    level?: import('../logging/logger').LogLevel | string;
    stdLog?: (message: string) => void;
    errorLog?: (message: string) => void;
  };

  /**
   * Per-protocol default parameter values applied before the handshake.
   */
  connectionDefaultSettings?: DefaultConnectionSettings;

  /**
   * Custom ticket store implementation.
   * Defaults to an in-memory `Map`-based store.
   */
  ticketStore?: TicketStore;

  /**
   * Default ticket TTL in milliseconds (time the ticket is valid before
   * a WebSocket connection consumes it).  Default: `300_000` (5 min).
   */
  defaultTicketTtlMs?: number;

  /**
   * Default connection TTL in milliseconds (maximum session lifetime).
   * `0` means unlimited.  Default: `0`.
   */
  defaultConnectionTtlMs?: number;

  /**
   * Maximum inactivity time in milliseconds before the connection is
   * automatically closed.  `0` disables.  Default: `0`.
   */
  maxInactivityTime?: number;
}

// ---------------------------------------------------------------------------
// Ticket issuance
// ---------------------------------------------------------------------------

/** Options for {@link GuacamoleServer.issueTicket}. */
export interface IssueTicketOptions {
  /** Override the server-level default ticket TTL (ms). */
  ticketTtlMs?: number;
  /** Override the server-level default connection TTL (ms). */
  connectionTtlMs?: number;
  /** Override the guacd target for this specific connection. */
  guacdOptions?: GuacdOptions;
}

/** Value returned by {@link GuacamoleServer.issueTicket}. */
export interface IssuedTicket {
  /** Unique ticket identifier to hand to the WebSocket client. */
  ticketId: string;
  /** ISO-8601 expiration timestamp for the ticket itself. */
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Guacamole protocol primitives
// ---------------------------------------------------------------------------

/**
 * An instruction parsed from the Guacamole protocol wire format.
 *
 * The first element is the opcode; remaining elements are string arguments.
 */
export type InstructionParts = [string, ...string[]];

// ---------------------------------------------------------------------------
// Connection state
// ---------------------------------------------------------------------------

/** Lifecycle state of a client connection. */
export enum ConnectionState {
  OPENING = 'opening',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
}
