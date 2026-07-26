import { EventEmitter } from 'events';
import type { ConnectionSettings } from '../../types';
import { ConnectionState } from '../../types';
import { ConnectionError, InactivityTimeoutError } from '../../errors';
import type { ILogger } from '../../logging/logger';

const mockGuacdClientInstances: MockGuacdClient[] = [];

class MockGuacdClient extends EventEmitter {
  guacamoleConnectionId: string | null = null;
  send = jest.fn();
  close = jest.fn();
  getState = jest.fn().mockReturnValue(ConnectionState.OPENING);

  constructor() {
    super();
    mockGuacdClientInstances.push(this);
  }

  simulateOpen(connectionId = '$abc-123'): void {
    this.guacamoleConnectionId = connectionId;
    this.emit('open', this);
  }
}

jest.mock('../../server/guacd-client', () => ({
  GuacdClient: jest.fn().mockImplementation(() => new MockGuacdClient()),
}));

import { ClientConnection } from '../../server/client-connection';
import { GuacdClient } from '../../server/guacd-client';
import type { WebSocket as WsWebSocket } from 'ws';

const OPEN = 1;
const CLOSED = 3;

class MockWebSocket extends EventEmitter {
  readyState = OPEN;
  send = jest.fn(
    (_data: unknown, _opts: unknown, cb?: (err?: Error) => void) => {
      if (typeof cb === 'function') cb();
    }
  );
  close = jest.fn();
  removeAllListeners = jest.fn(() => this);
}

const mockLogger: ILogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

const testSettings = {
  type: 'rdp' as const,
  settings: { hostname: '192.168.1.100' },
};

const guacdOptions = { host: '127.0.0.1', port: 4822 };
const mergedSettings = { hostname: '192.168.1.100', port: 3389 };

describe('ClientConnection', () => {
  let ws: MockWebSocket;
  let conn: ClientConnection;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGuacdClientInstances.length = 0;
    ws = new MockWebSocket();
    conn = new ClientConnection('conn-1', 'ticket-1', ws as unknown as WsWebSocket, testSettings, mockLogger, 0);
  });

  describe('constructor', () => {
    it('should set up WebSocket handlers', () => {
      expect(ws.listenerCount('message')).toBeGreaterThan(0);
      expect(ws.listenerCount('close')).toBeGreaterThan(0);
      expect(ws.listenerCount('error')).toBeGreaterThan(0);
    });

    it('should start in OPENING state', () => {
      expect(conn.getState()).toBe(ConnectionState.OPENING);
    });

    it('should store connectionId and ticketId', () => {
      expect(conn.connectionId).toBe('conn-1');
      expect(conn.ticketId).toBe('ticket-1');
    });
  });

  describe('connect', () => {
    it('should create a GuacdClient', () => {
      conn.connect(guacdOptions, mergedSettings);
      expect(GuacdClient).toHaveBeenCalled();
    });
  });

  describe('WebSocket -> guacd forwarding', () => {
    it('should forward string messages to guacdClient', () => {
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      ws.emit('message', 'hello');
      expect(guacd.send).toHaveBeenCalledWith('hello', true);
    });

    it('should forward Buffer messages as string', () => {
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      ws.emit('message', Buffer.from('hello'));
      expect(guacd.send).toHaveBeenCalledWith('hello', true);
    });

    it('should forward ArrayBuffer messages as string', () => {
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      const ab = new ArrayBuffer(5);
      const view = new Uint8Array(ab);
      view.set([104, 101, 108, 108, 111]); // "hello"
      ws.emit('message', ab);
      expect(guacd.send).toHaveBeenCalledWith('hello', true);
    });

    it('should forward Array of Buffers as concatenated string', () => {
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      ws.emit('message', [Buffer.from('hel'), Buffer.from('lo')]);
      expect(guacd.send).toHaveBeenCalledWith('hello', true);
    });
  });

  describe('guacd -> WebSocket forwarding', () => {
    it('should send data from guacdClient to WebSocket', () => {
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      guacd.simulateOpen();
      guacd.emit('data', 'guac-data');
      expect(ws.send).toHaveBeenCalledWith('guac-data', { binary: false }, expect.any(Function));
    });

    it('should not send when WebSocket is not OPEN', () => {
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      guacd.simulateOpen();
      ws.readyState = CLOSED;
      ws.send.mockClear();
      guacd.emit('data', 'guac-data');
      expect(ws.send).not.toHaveBeenCalled();
    });

    it('should not send when state is CLOSED', () => {
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      guacd.simulateOpen();
      conn.close();
      ws.send.mockClear();
      guacd.emit('data', 'guac-data');
      expect(ws.send).not.toHaveBeenCalled();
    });

    it('should close connection on send error', () => {
      conn.on('error', () => {});
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      guacd.simulateOpen();
      ws.send.mockImplementationOnce(
        (_data: unknown, _opts: unknown, cb?: (err?: Error) => void) => {
          if (typeof cb === 'function') cb(new Error('send failed'));
        }
      );
      guacd.emit('data', 'guac-data');
      expect(conn.getState()).toBe(ConnectionState.CLOSED);
    });
  });

  describe('ready event', () => {
    it('should emit ready when guacdClient emits open', () => {
      const readyHandler = jest.fn();
      conn.on('ready', readyHandler);
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      guacd.simulateOpen('$conn-id');
      expect(readyHandler).toHaveBeenCalledWith(conn);
      expect(conn.guacamoleConnectionId).toBe('$conn-id');
    });
  });

  describe('close', () => {
    it('should emit close event', () => {
      const closeHandler = jest.fn();
      conn.on('close', closeHandler);
      conn.connect(guacdOptions, mergedSettings);
      conn.close();
      expect(closeHandler).toHaveBeenCalledWith(conn, undefined);
    });

    it('should close guacdClient', () => {
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      conn.close();
      expect(guacd.close).toHaveBeenCalled();
    });

    it('should close WebSocket with normal code when no error', () => {
      conn.connect(guacdOptions, mergedSettings);
      conn.close();
      expect(ws.close).toHaveBeenCalledWith(1000, 'Connection closed normally');
    });

    it('should close WebSocket with error code when error provided', () => {
      conn.connect(guacdOptions, mergedSettings);
      conn.close(new Error('fail'));
      expect(ws.close).toHaveBeenCalledWith(1011, 'Internal server error');
    });

    it('should set state to CLOSED', () => {
      conn.connect(guacdOptions, mergedSettings);
      conn.close();
      expect(conn.getState()).toBe(ConnectionState.CLOSED);
    });

    it('should be idempotent', () => {
      const closeHandler = jest.fn();
      conn.on('close', closeHandler);
      conn.connect(guacdOptions, mergedSettings);
      conn.close();
      conn.close();
      expect(closeHandler).toHaveBeenCalledTimes(1);
    });

    it('should close when WebSocket close event fires', () => {
      const closeHandler = jest.fn();
      conn.on('close', closeHandler);
      conn.connect(guacdOptions, mergedSettings);
      ws.emit('close');
      expect(closeHandler).toHaveBeenCalled();
    });
  });

  describe('inactivity timeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should close with InactivityTimeoutError when idle', () => {
      const inactiveConn = new ClientConnection(
        'conn-2', 'ticket-2', ws as unknown as WsWebSocket, testSettings, mockLogger, 5000
      );
      const closeHandler = jest.fn();
      inactiveConn.on('close', closeHandler);
      inactiveConn.connect(guacdOptions, mergedSettings);
      jest.advanceTimersByTime(6001);
      expect(closeHandler).toHaveBeenCalledWith(inactiveConn, expect.any(InactivityTimeoutError));
    });

    it('should not set interval when maxInactivityTime is 0', () => {
      conn.connect(guacdOptions, mergedSettings);
      const closeHandler = jest.fn();
      conn.on('close', closeHandler);
      jest.advanceTimersByTime(60000);
      expect(closeHandler).not.toHaveBeenCalled();
    });
  });

  describe('connection TTL', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should close connection when TTL expires', () => {
      const closeHandler = jest.fn();
      conn.on('close', closeHandler);
      conn.connect(guacdOptions, mergedSettings, 10_000);
      jest.advanceTimersByTime(10_001);
      expect(closeHandler).toHaveBeenCalled();
    });

    it('should not set timeout when TTL is 0', () => {
      const closeHandler = jest.fn();
      conn.on('close', closeHandler);
      conn.connect(guacdOptions, mergedSettings, 0);
      jest.advanceTimersByTime(60000);
      expect(closeHandler).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should emit error event', () => {
      const errorHandler = jest.fn();
      conn.on('error', errorHandler);
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      guacd.simulateOpen();
      const err = new ConnectionError('test error');
      guacd.emit('error', err);
      expect(errorHandler).toHaveBeenCalledWith(conn, err);
    });

    it('should send error instruction to WebSocket', () => {
      conn.on('error', () => {});
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      guacd.simulateOpen();
      const err = new ConnectionError('test error');
      guacd.emit('error', err);
      const sentData = ws.send.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && call[0].includes('error')
      );
      expect(sentData).toBeDefined();
    });

    it('should handle WebSocket error event', () => {
      const errorHandler = jest.fn();
      conn.on('error', errorHandler);
      conn.connect(guacdOptions, mergedSettings);
      ws.emit('error', new Error('ws error'));
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('metadata', () => {
    it('should store metadata when provided', () => {
      const metadata = { userId: 'user-1', role: 'admin' };
      const metaConn = new ClientConnection(
        'conn-10', 'ticket-10', ws as unknown as WsWebSocket, testSettings, mockLogger, 0, metadata
      );
      expect(metaConn.metadata).toEqual(metadata);
    });

    it('should be undefined when not provided', () => {
      expect(conn.metadata).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return initial stats with zero bytes', () => {
      const stats = conn.getStats();
      expect(stats.connectionId).toBe('conn-1');
      expect(stats.ticketId).toBe('ticket-1');
      expect(stats.connectedAt).toBeInstanceOf(Date);
      expect(stats.bytesReceived).toBe(0);
      expect(stats.bytesSent).toBe(0);
      expect(stats.durationMs).toBeGreaterThanOrEqual(0);
      expect(stats.lastActivityAt).toBeInstanceOf(Date);
    });

    it('should include metadata', () => {
      const metadata = { userId: 'user-1' };
      const metaConn = new ClientConnection(
        'conn-20', 'ticket-20', ws as unknown as WsWebSocket, testSettings, mockLogger, 0, metadata
      );
      expect(metaConn.getStats().metadata).toEqual(metadata);
    });

    it('should count bytesReceived on WS message', () => {
      conn.connect(guacdOptions, mergedSettings);
      ws.emit('message', 'hello');
      expect(conn.getStats().bytesReceived).toBe(Buffer.byteLength('hello', 'utf-8'));
    });

    it('should count bytesSent on guacd data', () => {
      conn.connect(guacdOptions, mergedSettings);
      const guacd = mockGuacdClientInstances[0];
      guacd.simulateOpen();
      guacd.emit('data', 'guac-response');
      expect(conn.getStats().bytesSent).toBe(Buffer.byteLength('guac-response', 'utf-8'));
    });

    it('should accumulate bytes across multiple messages', () => {
      conn.connect(guacdOptions, mergedSettings);
      ws.emit('message', 'aaa');
      ws.emit('message', 'bbbbb');
      expect(conn.getStats().bytesReceived).toBe(8);
    });

    it('should update lastActivityAt on WS message', () => {
      const before = conn.getStats().lastActivityAt;
      conn.connect(guacdOptions, mergedSettings);
      ws.emit('message', 'ping');
      const after = conn.getStats().lastActivityAt;
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('getConnectionSelector', () => {
    it('should use join when set', () => {
      const joinSettings = {
        type: 'rdp' as const,
        join: '$existing-conn',
        settings: {},
      };
      const joinConn = new ClientConnection('conn-3', 'ticket-3', ws as unknown as WsWebSocket, joinSettings, mockLogger);
      joinConn.connect(guacdOptions, mergedSettings);
      const constructorArgs = (GuacdClient as unknown as jest.Mock).mock.calls as unknown[][];
      const lastCall = constructorArgs[constructorArgs.length - 1];
      expect(lastCall[1]).toBe('$existing-conn');
    });

    it('should use type when join is not set', () => {
      conn.connect(guacdOptions, mergedSettings);
      const constructorArgs = (GuacdClient as unknown as jest.Mock).mock.calls as unknown[][];
      const lastCall = constructorArgs[constructorArgs.length - 1];
      expect(lastCall[1]).toBe('rdp');
    });

    it('should throw ConnectionError when neither type nor join is set', () => {
      const badSettings = { settings: {} } as unknown as ConnectionSettings;
      const badConn = new ClientConnection('conn-4', 'ticket-4', ws as unknown as WsWebSocket, badSettings, mockLogger);
      expect(() => badConn.connect(guacdOptions, mergedSettings)).toThrow(ConnectionError);
    });
  });
});
