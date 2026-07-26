import { EventEmitter } from 'events';
import { ConnectionState } from '../../types';
import { GuacamoleParser } from '../../protocols/parser';
import {
  ServiceUnavailableError,
  ServiceNotFoundError,
  ConnectionTimeoutError,
  ConnectionResetError,
  ConnectionError,
  HandshakeError,
} from '../../errors';
import type { ILogger } from '../../logging/logger';

class MockSocket extends EventEmitter {
  destroyed = false;
  write = jest.fn((_data: string, cb?: (err?: Error) => void) => {
    if (cb) cb();
    return true;
  });
  end = jest.fn();
  destroy = jest.fn(() => {
    this.destroyed = true;
  });
  removeAllListeners = jest.fn(() => this);
  setTimeout = jest.fn();
}

let mockSocket: MockSocket;

jest.mock('net', () => ({
  connect: jest.fn(() => mockSocket),
}));

import { GuacdClient } from '../../server/guacd-client';
import * as net from 'net';

const mockLogger: ILogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

const testSettings = {
  type: 'rdp' as const,
  settings: {
    hostname: '192.168.1.100',
    username: 'admin',
    password: 'pass',
    width: 1024,
    height: 768,
  },
};

const guacdOptions = { host: '127.0.0.1', port: 4822 };

function createClient(inactivityTimeoutMs = 0): GuacdClient {
  return new GuacdClient(guacdOptions, 'rdp', testSettings, mockLogger, inactivityTimeoutMs);
}

function sendGuacInstruction(parts: string[]): void {
  const wire = GuacamoleParser.toInstruction(parts);
  mockSocket.emit('data', Buffer.from(wire));
}

function simulateHandshake(): void {
  mockSocket.emit('connect');
  sendGuacInstruction(['args', 'VERSION_1_5_0', 'hostname', 'port', 'username', 'password']);
  sendGuacInstruction(['ready', '$abc-123']);
}

describe('GuacdClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = new MockSocket();
    (net.connect as jest.Mock).mockReturnValue(mockSocket);
  });

  describe('connection lifecycle', () => {
    it('should call net.connect with correct host and port', () => {
      createClient();
      expect(net.connect).toHaveBeenCalledWith(4822, '127.0.0.1');
    });

    it('should send select instruction on TCP connect', () => {
      createClient();
      mockSocket.emit('connect');
      expect(mockSocket.write).toHaveBeenCalled();
      const written = mockSocket.write.mock.calls[0][0];
      expect(written).toContain('select');
      expect(written).toContain('rdp');
    });

    it('should emit open after full handshake', () => {
      const client = createClient();
      const openHandler = jest.fn();
      client.on('open', openHandler);
      simulateHandshake();
      expect(openHandler).toHaveBeenCalledTimes(1);
    });

    it('should store guacamoleConnectionId from ready instruction', () => {
      const client = createClient();
      simulateHandshake();
      expect(client.guacamoleConnectionId).toBe('$abc-123');
    });

    it('should transition state from OPENING to OPEN', () => {
      const client = createClient();
      expect(client.getState()).toBe(ConnectionState.OPENING);
      simulateHandshake();
      expect(client.getState()).toBe(ConnectionState.OPEN);
    });
  });

  describe('TCP error mapping', () => {
    it('should emit ServiceUnavailableError for ECONNREFUSED', () => {
      const client = createClient();
      const errorHandler = jest.fn();
      client.on('error', errorHandler);
      const tcpError = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
      mockSocket.emit('error', tcpError);
      expect(errorHandler).toHaveBeenCalledWith(expect.any(ServiceUnavailableError));
    });

    it('should emit ServiceNotFoundError for ENOTFOUND', () => {
      const client = createClient();
      const errorHandler = jest.fn();
      client.on('error', errorHandler);
      const tcpError = Object.assign(new Error('not found'), { code: 'ENOTFOUND' });
      mockSocket.emit('error', tcpError);
      expect(errorHandler).toHaveBeenCalledWith(expect.any(ServiceNotFoundError));
    });

    it('should emit ConnectionTimeoutError for ETIMEDOUT', () => {
      const client = createClient();
      const errorHandler = jest.fn();
      client.on('error', errorHandler);
      const tcpError = Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' });
      mockSocket.emit('error', tcpError);
      expect(errorHandler).toHaveBeenCalledWith(expect.any(ConnectionTimeoutError));
    });

    it('should emit ConnectionResetError for ECONNRESET', () => {
      const client = createClient();
      const errorHandler = jest.fn();
      client.on('error', errorHandler);
      const tcpError = Object.assign(new Error('reset'), { code: 'ECONNRESET' });
      mockSocket.emit('error', tcpError);
      expect(errorHandler).toHaveBeenCalledWith(expect.any(ConnectionResetError));
    });

    it('should emit ConnectionError for unknown error codes', () => {
      const client = createClient();
      const errorHandler = jest.fn();
      client.on('error', errorHandler);
      const tcpError = Object.assign(new Error('unknown'), { code: 'EUNKNOWN' });
      mockSocket.emit('error', tcpError);
      expect(errorHandler).toHaveBeenCalledWith(expect.any(ConnectionError));
    });
  });

  describe('processInstruction', () => {
    it('should close with HandshakeError when ready has empty connection ID', () => {
      const client = createClient();
      const closeHandler = jest.fn();
      client.on('close', closeHandler);
      mockSocket.emit('connect');
      sendGuacInstruction(['args', 'hostname']);
      sendGuacInstruction(['ready', '']);
      expect(closeHandler).toHaveBeenCalledWith(expect.any(HandshakeError));
    });

    it('should close with HandshakeError on error during OPENING', () => {
      const client = createClient();
      const closeHandler = jest.fn();
      client.on('close', closeHandler);
      mockSocket.emit('connect');
      sendGuacInstruction(['args', 'hostname']);
      sendGuacInstruction(['error', 'Protocol error', '512']);
      expect(closeHandler).toHaveBeenCalledWith(expect.any(HandshakeError));
    });

    it('should forward other opcodes as data events after OPEN', () => {
      const client = createClient();
      const dataHandler = jest.fn();
      client.on('data', dataHandler);
      simulateHandshake();
      sendGuacInstruction(['sync', '12345']);
      expect(dataHandler).toHaveBeenCalled();
      const forwarded = (dataHandler.mock.calls as unknown[][]).find(
        (call) => typeof call[0] === 'string' && call[0].includes('sync')
      );
      expect(forwarded).toBeDefined();
    });
  });

  describe('send', () => {
    it('should write data to TCP socket', () => {
      const client = createClient();
      simulateHandshake();
      mockSocket.write.mockClear();
      client.send('test-data');
      expect(mockSocket.write).toHaveBeenCalled();
      expect(mockSocket.write.mock.calls[0][0]).toBe('test-data');
    });

    it('should buffer data when afterOpened=true and state=OPENING', () => {
      const client = createClient();
      const initialWriteCount = mockSocket.write.mock.calls.length;
      client.send('buffered-data', true);
      expect(mockSocket.write.mock.calls.length).toBe(initialWriteCount);
    });

    it('should flush buffer on ready', () => {
      const client = createClient();
      client.send('buffered-data', true);
      simulateHandshake();
      const allWrites = mockSocket.write.mock.calls.map((c: unknown[]) => c[0] as string).join('');
      expect(allWrites).toContain('buffered-data');
    });

    it('should no-op when state is CLOSED', () => {
      const client = createClient();
      client.close();
      mockSocket.write.mockClear();
      client.send('data');
      expect(mockSocket.write).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should emit close event', () => {
      const client = createClient();
      const closeHandler = jest.fn();
      client.on('close', closeHandler);
      client.close();
      expect(closeHandler).toHaveBeenCalledTimes(1);
    });

    it('should call end() and destroy() on socket', () => {
      const client = createClient();
      client.close();
      expect(mockSocket.end).toHaveBeenCalled();
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it('should set state to CLOSED', () => {
      const client = createClient();
      client.close();
      expect(client.getState()).toBe(ConnectionState.CLOSED);
    });

    it('should be idempotent', () => {
      const client = createClient();
      const closeHandler = jest.fn();
      client.on('close', closeHandler);
      client.close();
      client.close();
      expect(closeHandler).toHaveBeenCalledTimes(1);
    });

    it('should pass error to close event', () => {
      const client = createClient();
      const closeHandler = jest.fn();
      client.on('close', closeHandler);
      const err = new Error('test');
      client.close(err);
      expect(closeHandler).toHaveBeenCalledWith(err);
    });
  });

  describe('inactivity timeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should close with ConnectionTimeoutError when inactive', () => {
      const client = createClient(5000);
      const closeHandler = jest.fn();
      client.on('close', closeHandler);
      jest.advanceTimersByTime(6001);
      expect(closeHandler).toHaveBeenCalledWith(expect.any(ConnectionTimeoutError));
    });

    it('should not set interval when inactivityTimeoutMs is 0', () => {
      const client = createClient(0);
      const closeHandler = jest.fn();
      client.on('close', closeHandler);
      jest.advanceTimersByTime(60000);
      expect(closeHandler).not.toHaveBeenCalled();
    });
  });

  describe('handleClose', () => {
    it('should close with error when hadError is true', () => {
      const client = createClient();
      const closeHandler = jest.fn();
      client.on('close', closeHandler);
      mockSocket.emit('close', true);
      expect(closeHandler).toHaveBeenCalledWith(expect.any(ConnectionError));
    });

    it('should close without error when hadError is false', () => {
      const client = createClient();
      const closeHandler = jest.fn();
      client.on('close', closeHandler);
      mockSocket.emit('close', false);
      expect(closeHandler).toHaveBeenCalledWith(undefined);
    });
  });

  describe('handshake without version', () => {
    it('should handle args without VERSION_ tokens', () => {
      const client = createClient();
      const openHandler = jest.fn();
      client.on('open', openHandler);
      mockSocket.emit('connect');
      sendGuacInstruction(['args', 'hostname', 'port']);
      sendGuacInstruction(['ready', '$no-version']);
      expect(openHandler).toHaveBeenCalled();
    });

    it('should pick highest version from multiple VERSION_ tokens', () => {
      createClient();
      mockSocket.emit('connect');
      sendGuacInstruction(['args', 'VERSION_1_1_0', 'VERSION_1_5_0', 'VERSION_1_3_0', 'hostname']);
      const allWrites = mockSocket.write.mock.calls.map((c: unknown[]) => c[0] as string).join('');
      expect(allWrites).toContain('VERSION_1_5_0');
    });

    it('should handle settings with array values', () => {
      const settingsWithArray = {
        type: 'rdp' as const,
        settings: { hostname: '192.168.1.100', audio: ['audio/L16', 'audio/L8'] },
      };
      new GuacdClient(guacdOptions, 'rdp', settingsWithArray, mockLogger, 0);
      mockSocket.emit('connect');
      sendGuacInstruction(['args', 'hostname', 'audio']);
      const allWrites = mockSocket.write.mock.calls.map((c: unknown[]) => c[0] as string).join('');
      expect(allWrites).toContain('connect');
    });
  });

  describe('send edge cases', () => {
    it('should throw ConnectionError when no connection available', () => {
      const client = createClient();
      simulateHandshake();
      (client as unknown as { connection: null }).connection = null;
      expect(() => client.send('data')).toThrow(ConnectionError);
    });

    it('should close on write error', () => {
      const client = createClient();
      simulateHandshake();
      const closeHandler = jest.fn();
      client.on('close', closeHandler);
      mockSocket.write.mockImplementationOnce(
        (_data: string, cb?: (err?: Error) => void) => {
          if (cb) cb(new Error('write failed'));
          return true;
        }
      );
      client.send('data');
      expect(closeHandler).toHaveBeenCalledWith(expect.any(ConnectionError));
    });
  });

  describe('version negotiation', () => {
    it('should send timezone when protocol version >= 1.1', () => {
      const settingsWithTz = {
        type: 'rdp' as const,
        settings: { ...testSettings.settings, timezone: 'Asia/Tokyo' },
      };
      new GuacdClient(guacdOptions, 'rdp', settingsWithTz, mockLogger, 0);
      mockSocket.emit('connect');
      sendGuacInstruction(['args', 'VERSION_1_5_0', 'hostname']);
      const allWrites = mockSocket.write.mock.calls.map((c: unknown[]) => c[0] as string).join('');
      expect(allWrites).toContain('timezone');
      expect(allWrites).toContain('Asia/Tokyo');
    });
  });
});
