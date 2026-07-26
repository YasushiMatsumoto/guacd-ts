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
import type { ILogger } from '../logging/logger';
import { TicketNotFoundError, TicketExpiredError, TicketAlreadyUsedError } from '../errors';

// ---------------------------------------------------------------------------
// In-memory default store
// ---------------------------------------------------------------------------

/**
 * Simple `Map`-based ticket store used when no custom store is provided.
 */
class InMemoryTicketStore implements TicketStore {
  private store = new Map<string, TicketData>();
  private readonly sweepInterval: NodeJS.Timeout;

  constructor(
    private readonly logger?: ILogger,
    sweepIntervalMs = 60_000
  ) {
    this.sweepInterval = setInterval(() => this.sweep(), sweepIntervalMs);
    if (this.sweepInterval.unref) {
      this.sweepInterval.unref();
    }
  }

  get(ticketId: string): TicketData | null {
    return this.store.get(ticketId) ?? null;
  }

  set(ticketId: string, data: TicketData): void {
    this.store.set(ticketId, data);
  }

  delete(ticketId: string): void {
    this.store.delete(ticketId);
  }

  destroy(): void {
    clearInterval(this.sweepInterval);
  }

  private sweep(): void {
    const now = new Date();
    let deleted = 0;
    for (const [id, ticket] of this.store) {
      if (ticket.consumedAt || new Date(ticket.ticketExpiresAt) < now) {
        this.store.delete(id);
        deleted++;
      }
    }
    if (deleted > 0) {
      this.logger?.debug('Swept expired tickets', { count: deleted });
    }
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
  /** Logger instance for ticket lifecycle events. */
  logger?: ILogger;
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
  private readonly logger?: ILogger;
  private readonly locks = new Map<string, Promise<void>>();

  constructor(options?: TicketManagerOptions) {
    this.logger = options?.logger;
    this.store = options?.store ?? new InMemoryTicketStore(this.logger);
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
      metadata: options?.metadata,
    };

    await this.store.set(ticketId, data);

    this.logger?.info('Ticket issued', { ticketId, ttlMs: ttl });
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

    this.logger?.verbose('Ticket validated', { ticketId });
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
    return this.withTicketLock(ticketId, async () => {
      const data = await this.validateTicket(ticketId);
      data.consumedAt = new Date().toISOString();
      await this.store.set(ticketId, data);
      this.logger?.info('Ticket consumed', { ticketId });
      return data;
    });
  }

  /**
   * Manually revoke (delete) a ticket.
   */
  async revokeTicket(ticketId: string): Promise<void> {
    await this.store.delete(ticketId);
    this.logger?.info('Ticket revoked', { ticketId });
  }

  /** Release resources held by the ticket manager (e.g. sweep timers). */
  destroy(): void {
    if ('destroy' in this.store && typeof (this.store as { destroy?: () => void }).destroy === 'function') {
      (this.store as { destroy: () => void }).destroy();
    }
    this.logger?.debug('TicketManager destroyed');
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private async withTicketLock<T>(ticketId: string, fn: () => Promise<T>): Promise<T> {
    while (this.locks.has(ticketId)) {
      await this.locks.get(ticketId);
    }
    let resolve!: () => void;
    const lock = new Promise<void>((r) => { resolve = r; });
    this.locks.set(ticketId, lock);
    try {
      return await fn();
    } finally {
      this.locks.delete(ticketId);
      resolve();
    }
  }
}
