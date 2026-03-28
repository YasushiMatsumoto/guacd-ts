/**
 * Ticket lifecycle management for guacd-ts.
 *
 * @packageDocumentation
 */

import { randomUUID } from 'crypto';
import type {
  ConnectionSettings,
  IssueTicketOptions,
  IssuedTicket,
  TicketData,
  TicketStore,
} from '../types';
import { TicketNotFoundError, TicketExpiredError, TicketAlreadyUsedError } from '../errors';

// ---------------------------------------------------------------------------
// In-memory default store
// ---------------------------------------------------------------------------

/**
 * Simple `Map`-based ticket store used when no custom store is provided.
 */
class InMemoryTicketStore implements TicketStore {
  private store = new Map<string, TicketData>();

  get(ticketId: string): TicketData | null {
    return this.store.get(ticketId) ?? null;
  }

  set(ticketId: string, data: TicketData): void {
    this.store.set(ticketId, data);
  }

  delete(ticketId: string): void {
    this.store.delete(ticketId);
  }
}

// ---------------------------------------------------------------------------
// TicketManager
// ---------------------------------------------------------------------------

/** Options for constructing a {@link TicketManager}. */
export interface TicketManagerOptions {
  /** Custom ticket persistence.  Defaults to in-memory `Map`. */
  store?: TicketStore;
  /** Default ticket TTL in ms (default `300_000` — 5 min). */
  defaultTicketTtlMs?: number;
  /** Default connection lifetime in ms (`0` = unlimited). */
  defaultConnectionTtlMs?: number;
}

/**
 * Manages the lifecycle of connection tickets: issuance, validation,
 * consumption, and revocation.
 *
 * @example
 * ```ts
 * const manager = new TicketManager();
 * const { ticketId } = manager.issueTicket(connectionSettings);
 *
 * // Later, when the WebSocket connects:
 * const data = await manager.validateAndConsume(ticketId);
 * ```
 */
export class TicketManager {
  private readonly store: TicketStore;
  private readonly defaultTicketTtlMs: number;
  private readonly defaultConnectionTtlMs: number;

  constructor(options?: TicketManagerOptions) {
    this.store = options?.store ?? new InMemoryTicketStore();
    this.defaultTicketTtlMs = options?.defaultTicketTtlMs ?? 300_000; // 5 min
    this.defaultConnectionTtlMs = options?.defaultConnectionTtlMs ?? 0;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Issue a new ticket for the given connection settings.
   *
   * @param connectionSettings - Settings forwarded to guacd on connection.
   * @param options            - Per-ticket overrides.
   * @returns The ticket ID and its expiration timestamp.
   */
  async issueTicket(
    connectionSettings: ConnectionSettings,
    options?: IssueTicketOptions
  ): Promise<IssuedTicket> {
    const ticketId = randomUUID();
    const now = new Date();
    const ttl = options?.ticketTtlMs ?? this.defaultTicketTtlMs;
    const expiresAt = new Date(now.getTime() + ttl);

    const data: TicketData = {
      ticketId,
      connectionSettings,
      createdAt: now.toISOString(),
      ticketExpiresAt: expiresAt.toISOString(),
      connectionTtlMs: options?.connectionTtlMs ?? this.defaultConnectionTtlMs,
      guacdOptions: options?.guacdOptions,
    };

    await this.store.set(ticketId, data);

    return { ticketId, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Validate a ticket without consuming it.
   *
   * @throws {TicketNotFoundError} If the ticket does not exist.
   * @throws {TicketExpiredError}  If the ticket has expired.
   * @throws {TicketAlreadyUsedError} If the ticket was already consumed.
   */
  async validateTicket(ticketId: string): Promise<TicketData> {
    const data = await this.store.get(ticketId);

    if (!data) {
      throw new TicketNotFoundError(ticketId);
    }

    if (data.consumedAt) {
      throw new TicketAlreadyUsedError(ticketId);
    }

    if (new Date(data.ticketExpiresAt) < new Date()) {
      throw new TicketExpiredError(ticketId, new Date(data.ticketExpiresAt).toISOString());
    }

    return data;
  }

  /**
   * Mark a ticket as consumed.  A consumed ticket cannot be reused.
   *
   * @throws {TicketNotFoundError} If the ticket does not exist.
   */
  async consumeTicket(ticketId: string): Promise<void> {
    const data = await this.store.get(ticketId);
    if (!data) throw new TicketNotFoundError(ticketId);

    data.consumedAt = new Date().toISOString();
    await this.store.set(ticketId, data);
  }

  /**
   * Validate **and** consume a ticket in a single atomic step.
   *
   * This is the method called during the WebSocket upgrade flow.
   *
   * @throws {TicketNotFoundError}
   * @throws {TicketExpiredError}
   * @throws {TicketAlreadyUsedError}
   */
  async validateAndConsume(ticketId: string): Promise<TicketData> {
    const data = await this.validateTicket(ticketId);
    data.consumedAt = new Date().toISOString();
    await this.store.set(ticketId, data);
    return data;
  }

  /**
   * Manually revoke (delete) a ticket.
   */
  async revokeTicket(ticketId: string): Promise<void> {
    await this.store.delete(ticketId);
  }
}
