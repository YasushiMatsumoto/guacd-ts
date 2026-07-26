import { TicketManager } from '../../server/ticket-manager';
import type { ConnectionSettings, TicketData, TicketStore } from '../../types';
import {
  TicketNotFoundError,
  TicketExpiredError,
  TicketAlreadyUsedError,
} from '../../errors';

const testSettings: ConnectionSettings = {
  type: 'rdp',
  settings: { hostname: '192.168.1.100', username: 'admin' },
};

describe('TicketManager', () => {
  let manager: TicketManager;

  beforeEach(() => {
    jest.useFakeTimers();
    manager = new TicketManager();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('issueTicket', () => {
    it('should return ticketId and expiresAt', async () => {
      const result = await manager.issueTicket(testSettings);
      expect(result.ticketId).toBeDefined();
      expect(typeof result.ticketId).toBe('string');
      expect(result.ticketId.length).toBeGreaterThan(0);
      expect(result.expiresAt).toBeDefined();
      expect(() => new Date(result.expiresAt)).not.toThrow();
    });

    it('should use default TTL of 300000ms', async () => {
      const now = Date.now();
      const result = await manager.issueTicket(testSettings);
      const expiresAt = new Date(result.expiresAt).getTime();
      expect(expiresAt - now).toBe(300_000);
    });

    it('should respect custom default TTL', async () => {
      const customManager = new TicketManager({ defaultTicketTtlMs: 60_000 });
      const now = Date.now();
      const result = await customManager.issueTicket(testSettings);
      const expiresAt = new Date(result.expiresAt).getTime();
      expect(expiresAt - now).toBe(60_000);
    });

    it('should respect per-ticket TTL override', async () => {
      const now = Date.now();
      const result = await manager.issueTicket(testSettings, { ticketTtlMs: 10_000 });
      const expiresAt = new Date(result.expiresAt).getTime();
      expect(expiresAt - now).toBe(10_000);
    });

    it('should store connectionTtlMs from options', async () => {
      const result = await manager.issueTicket(testSettings, { connectionTtlMs: 60_000 });
      const data = await manager.validateTicket(result.ticketId);
      expect(data.connectionTtlMs).toBe(60_000);
    });

    it('should store guacdOptions from options', async () => {
      const guacdOptions = { host: '10.0.0.1', port: 4822 };
      const result = await manager.issueTicket(testSettings, { guacdOptions });
      const data = await manager.validateTicket(result.ticketId);
      expect(data.guacdOptions).toEqual(guacdOptions);
    });
  });

  describe('validateTicket', () => {
    it('should return ticket data for a valid ticket', async () => {
      const { ticketId } = await manager.issueTicket(testSettings);
      const data = await manager.validateTicket(ticketId);
      expect(data.ticketId).toBe(ticketId);
      expect(data.connectionSettings).toEqual(testSettings);
    });

    it('should throw TicketNotFoundError for unknown ticketId', async () => {
      await expect(manager.validateTicket('nonexistent')).rejects.toThrow(TicketNotFoundError);
    });

    it('should throw TicketExpiredError for expired ticket', async () => {
      const { ticketId } = await manager.issueTicket(testSettings, { ticketTtlMs: 1000 });
      jest.advanceTimersByTime(1001);
      await expect(manager.validateTicket(ticketId)).rejects.toThrow(TicketExpiredError);
    });

    it('should throw TicketAlreadyUsedError for consumed ticket', async () => {
      const { ticketId } = await manager.issueTicket(testSettings);
      await manager.consumeTicket(ticketId);
      await expect(manager.validateTicket(ticketId)).rejects.toThrow(TicketAlreadyUsedError);
    });
  });

  describe('consumeTicket', () => {
    it('should mark ticket as consumed', async () => {
      const { ticketId } = await manager.issueTicket(testSettings);
      await manager.consumeTicket(ticketId);
      await expect(manager.validateTicket(ticketId)).rejects.toThrow(TicketAlreadyUsedError);
    });

    it('should throw TicketNotFoundError for unknown ticketId', async () => {
      await expect(manager.consumeTicket('nonexistent')).rejects.toThrow(TicketNotFoundError);
    });
  });

  describe('validateAndConsume', () => {
    it('should validate and consume in one step', async () => {
      const { ticketId } = await manager.issueTicket(testSettings);
      const data = await manager.validateAndConsume(ticketId);
      expect(data.ticketId).toBe(ticketId);
      expect(data.consumedAt).toBeDefined();
    });

    it('should throw TicketAlreadyUsedError on second call', async () => {
      const { ticketId } = await manager.issueTicket(testSettings);
      await manager.validateAndConsume(ticketId);
      await expect(manager.validateAndConsume(ticketId)).rejects.toThrow(TicketAlreadyUsedError);
    });

    it('should throw TicketNotFoundError for unknown ticketId', async () => {
      await expect(manager.validateAndConsume('nonexistent')).rejects.toThrow(TicketNotFoundError);
    });

    it('should throw TicketExpiredError for expired ticket', async () => {
      const { ticketId } = await manager.issueTicket(testSettings, { ticketTtlMs: 1000 });
      jest.advanceTimersByTime(1001);
      await expect(manager.validateAndConsume(ticketId)).rejects.toThrow(TicketExpiredError);
    });
  });

  describe('revokeTicket', () => {
    it('should remove the ticket', async () => {
      const { ticketId } = await manager.issueTicket(testSettings);
      await manager.revokeTicket(ticketId);
      await expect(manager.validateTicket(ticketId)).rejects.toThrow(TicketNotFoundError);
    });

    it('should not throw when revoking nonexistent ticket', async () => {
      await expect(manager.revokeTicket('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('metadata', () => {
    it('should store metadata from options', async () => {
      const metadata = { userId: 'user-123', role: 'admin' };
      const result = await manager.issueTicket(testSettings, { metadata });
      const data = await manager.validateTicket(result.ticketId);
      expect(data.metadata).toEqual(metadata);
    });

    it('should preserve metadata through validateAndConsume', async () => {
      const metadata = { userId: 'user-456' };
      const { ticketId } = await manager.issueTicket(testSettings, { metadata });
      const data = await manager.validateAndConsume(ticketId);
      expect(data.metadata).toEqual(metadata);
    });

    it('should be undefined when not provided', async () => {
      const { ticketId } = await manager.issueTicket(testSettings);
      const data = await manager.validateTicket(ticketId);
      expect(data.metadata).toBeUndefined();
    });
  });

  describe('custom TicketStore', () => {
    it('should use the provided store', async () => {
      const mockSet = jest.fn();
      const store: TicketStore = {
        get: jest.fn().mockReturnValue(null),
        set: mockSet,
        delete: jest.fn(),
      };
      const customManager = new TicketManager({ store });
      await customManager.issueTicket(testSettings);
      expect(mockSet).toHaveBeenCalledTimes(1);
    });

    it('should call get on the custom store during validation', async () => {
      const ticketData: TicketData = {
        ticketId: 'custom-id',
        connectionSettings: testSettings,
        createdAt: new Date().toISOString(),
        ticketExpiresAt: new Date(Date.now() + 300_000).toISOString(),
        connectionTtlMs: 0,
      };
      const mockGet = jest.fn().mockReturnValue(ticketData);
      const store: TicketStore = {
        get: mockGet,
        set: jest.fn(),
        delete: jest.fn(),
      };
      const customManager = new TicketManager({ store });
      const data = await customManager.validateTicket('custom-id');
      expect(mockGet).toHaveBeenCalledWith('custom-id');
      expect(data.ticketId).toBe('custom-id');
    });

    it('should call delete on the custom store during revocation', async () => {
      const mockDelete = jest.fn();
      const store: TicketStore = {
        get: jest.fn(),
        set: jest.fn(),
        delete: mockDelete,
      };
      const customManager = new TicketManager({ store });
      await customManager.revokeTicket('some-id');
      expect(mockDelete).toHaveBeenCalledWith('some-id');
    });
  });
});
