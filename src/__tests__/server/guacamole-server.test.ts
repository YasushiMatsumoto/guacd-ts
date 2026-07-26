import { EventEmitter } from 'events';
import type http from 'http';
import type net from 'net';
import type { ILogger } from '../../logging/logger';
import type { ConnectionSettings } from '../../types';
import { ConnectionState } from '../../types';

const mockGuacdClientInstances: MockGuacdClient[] = [];

class MockGuacdClient extends EventEmitter {
  guacamoleConnectionId: string | null = '$mock-conn';
  send = jest.fn();
  close = jest.fn();
  getState = jest.fn().mockReturnValue(ConnectionState.OPENING);

  constructor() {
    super();
    mockGuacdClientInstances.push(this);
  }
}

jest.mock('../../server/guacd-client', () => ({
  GuacdClient: jest.fn().mockImplementation(() => new MockGuacdClient()),
}));

const OPEN = 1;

class MockWebSocket extends EventEmitter {
  readyState = OPEN;
  send = jest.fn((_data: unknown, _opts: unknown, cb?: (err?: Error) => void) => {
    if (typeof cb === 'function') cb();
  });
  close = jest.fn();
  removeAllListeners = jest.fn(() => this);
}

let wssConnectionCallback: ((ws: MockWebSocket) => void) | null = null;

const mockWssClose = jest.fn((cb?: () => void) => {
  if (cb) cb();
});

type HandleUpgradeFn = (
  req: http.IncomingMessage,
  socket: net.Socket,
  head: Buffer,
  cb: (ws: MockWebSocket) => void
) => void;

const mockHandleUpgrade = jest.fn<void, Parameters<HandleUpgradeFn>>(
  (_req, _socket, _head, cb) => {
    const ws = new MockWebSocket();
    wssConnectionCallback = (): void => cb(ws);
  }
);

jest.mock('ws', () => {
  return {
    Server: jest.fn().mockImplementation(() => ({
      handleUpgrade: mockHandleUpgrade,
      close: mockWssClose,
    })),
    OPEN: 1,
    CONNECTING: 0,
  };
});

import { GuacamoleServer } from '../../server/guacamole-server';

const mockLogger: ILogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

const testSettings: ConnectionSettings = {
  type: 'rdp',
  settings: { hostname: '192.168.1.100', username: 'admin' },
};

function createMockRequest(url: string): http.IncomingMessage {
  return { url, headers: {} } as unknown as http.IncomingMessage;
}

function createMockSocket(): net.Socket {
  return new EventEmitter() as unknown as net.Socket;
}

async function connectClient(
  srv: GuacamoleServer,
  url: string
): Promise<MockWebSocket> {
  srv.handleUpgrade(createMockRequest(url), createMockSocket(), Buffer.alloc(0));
  const ws = new MockWebSocket();
  const calls = mockHandleUpgrade.mock.calls;
  const lastCallArgs = calls[calls.length - 1];
  const cb = lastCallArgs[3];
  cb(ws);
  await new Promise<void>((r) => setTimeout(r, 0));
  return ws;
}

describe('GuacamoleServer', () => {
  let server: GuacamoleServer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGuacdClientInstances.length = 0;
    wssConnectionCallback = null;
    server = new GuacamoleServer({ logger: mockLogger });
  });

  afterEach(async () => {
    await server.close();
  });

  describe('constructor', () => {
    it('should create with default options', () => {
      const s = new GuacamoleServer();
      expect(s).toBeInstanceOf(GuacamoleServer);
      expect(s).toBeInstanceOf(EventEmitter);
    });

    it('should accept custom logger', () => {
      const s = new GuacamoleServer({ logger: mockLogger });
      expect(s).toBeDefined();
    });
  });

  describe('issueTicket', () => {
    it('should return ticketId and expiresAt', async () => {
      const result = await server.issueTicket(testSettings);
      expect(result.ticketId).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should accept options', async () => {
      const result = await server.issueTicket(testSettings, {
        ticketTtlMs: 60_000,
        connectionTtlMs: 300_000,
        guacdOptions: { host: '10.0.0.1' },
      });
      expect(result.ticketId).toBeDefined();
    });
  });

  describe('revokeTicket', () => {
    it('should revoke a previously issued ticket', async () => {
      const { ticketId } = await server.issueTicket(testSettings);
      await expect(server.revokeTicket(ticketId)).resolves.toBeUndefined();
    });
  });

  describe('attach', () => {
    it('should register upgrade handler on httpServer', () => {
      const httpServer = new EventEmitter();
      server.attach(httpServer as unknown as http.Server);
      expect(httpServer.listenerCount('upgrade')).toBe(1);
    });

    it('should filter by path when provided', () => {
      const httpServer = new EventEmitter();
      server.attach(httpServer as unknown as http.Server, '/guacamole');
      type UpgradeListener = (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => void;
      const listener = httpServer.listeners('upgrade')[0] as unknown as UpgradeListener;
      listener(createMockRequest('/other-path?ticket=abc'), createMockSocket(), Buffer.alloc(0));
      expect(wssConnectionCallback).toBeNull();
    });

    it('should handle matching path', () => {
      const httpServer = new EventEmitter();
      server.attach(httpServer as unknown as http.Server, '/guacamole');
      type UpgradeListener = (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => void;
      const listener = httpServer.listeners('upgrade')[0] as unknown as UpgradeListener;
      listener(createMockRequest('/guacamole?ticket=abc'), createMockSocket(), Buffer.alloc(0));
      expect(wssConnectionCallback).not.toBeNull();
    });

    it('should auto-close when httpServer emits close', async () => {
      const httpServer = new EventEmitter();
      server.attach(httpServer as unknown as http.Server);
      httpServer.emit('close');
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(mockWssClose).toHaveBeenCalled();
    });

    it('should handle close being called before httpServer closes', async () => {
      const httpServer = new EventEmitter();
      server.attach(httpServer as unknown as http.Server);
      await server.close();
      mockWssClose.mockClear();
      httpServer.emit('close');
      await new Promise<void>((r) => setTimeout(r, 0));
      expect(mockWssClose).not.toHaveBeenCalled();
    });
  });

  describe('handleNewConnection', () => {
    it('should close with 4401 when no ticket in URL', async () => {
      const ws = await connectClient(server, '/');
      expect(ws.close).toHaveBeenCalledWith(4401, expect.any(String));
    });

    it('should accept ticket query parameter', async () => {
      const { ticketId } = await server.issueTicket(testSettings);
      const ws = await connectClient(server, `/?ticket=${ticketId}`);
      expect(ws.close).not.toHaveBeenCalledWith(4401, expect.any(String));
    });

    it('should accept ticket_id query parameter', async () => {
      const { ticketId } = await server.issueTicket(testSettings);
      const ws = await connectClient(server, `/?ticket_id=${ticketId}`);
      expect(ws.close).not.toHaveBeenCalledWith(4401, expect.any(String));
    });

    it('should accept token query parameter', async () => {
      const { ticketId } = await server.issueTicket(testSettings);
      const ws = await connectClient(server, `/?token=${ticketId}`);
      expect(ws.close).not.toHaveBeenCalledWith(4401, expect.any(String));
    });

    it('should close with 4401 when ticket validation fails', async () => {
      const ws = await connectClient(server, '/?ticket=invalid-ticket');
      expect(ws.close).toHaveBeenCalledWith(4401, expect.any(String));
    });

    it('should call onBeforeConnect hook', async () => {
      const onBeforeConnect = jest.fn();
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger, hooks: { onBeforeConnect } });
      const { ticketId } = await server.issueTicket(testSettings);
      await connectClient(server, `/?ticket=${ticketId}`);
      expect(onBeforeConnect).toHaveBeenCalled();
    });

    it('should close with 4403 when onAuthenticate returns false', async () => {
      const onAuthenticate = jest.fn().mockReturnValue(false);
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger, hooks: { onAuthenticate } });
      const { ticketId } = await server.issueTicket(testSettings);
      const ws = await connectClient(server, `/?ticket=${ticketId}`);
      expect(ws.close).toHaveBeenCalledWith(4403, 'Forbidden');
    });

    it('should allow connection when onAuthenticate returns true', async () => {
      const onAuthenticate = jest.fn().mockReturnValue(true);
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger, hooks: { onAuthenticate } });
      const { ticketId } = await server.issueTicket(testSettings);
      const ws = await connectClient(server, `/?ticket=${ticketId}`);
      expect(ws.close).not.toHaveBeenCalledWith(4403, expect.any(String));
    });
  });

  describe('getActiveConnections', () => {
    it('should return 0 initially', () => {
      expect(server.getActiveConnections()).toBe(0);
    });
  });

  describe('getConnection', () => {
    it('should return undefined for unknown connectionId', () => {
      expect(server.getConnection('nonexistent')).toBeUndefined();
    });

    it('should return a connection after it is established', async () => {
      const { ticketId } = await server.issueTicket(testSettings);
      await connectClient(server, `/?ticket=${ticketId}`);
      expect(server.getActiveConnections()).toBe(1);
      const list = server.getConnectionList();
      const conn = server.getConnection(list[0].connectionId);
      expect(conn).toBeDefined();
      expect(conn?.ticketId).toBe(ticketId);
    });
  });

  describe('getConnectionList', () => {
    it('should return empty array initially', () => {
      expect(server.getConnectionList()).toEqual([]);
    });
  });

  describe('disconnectConnection', () => {
    it('should return false for unknown connectionId', () => {
      expect(server.disconnectConnection('nonexistent')).toBe(false);
    });

    it('should disconnect an active connection and return true', async () => {
      const { ticketId } = await server.issueTicket(testSettings);
      await connectClient(server, `/?ticket=${ticketId}`);
      const list = server.getConnectionList();
      expect(list.length).toBe(1);
      const result = server.disconnectConnection(list[0].connectionId, 'Admin kick');
      expect(result).toBe(true);
      await new Promise((r) => setTimeout(r, 0));
      expect(server.getActiveConnections()).toBe(0);
    });
  });

  describe('metadata', () => {
    it('should pass metadata from ticket to connection', async () => {
      const metadata = { userId: 'user-1' };
      const { ticketId } = await server.issueTicket(testSettings, { metadata });
      await connectClient(server, `/?ticket=${ticketId}`);
      const list = server.getConnectionList();
      expect(list[0].metadata).toEqual(metadata);
    });
  });

  describe('close', () => {
    it('should close WebSocket.Server', async () => {
      await server.close();
      expect(mockWssClose).toHaveBeenCalled();
    });

    it('should return a Promise', () => {
      const result = server.close();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('maxConnections', () => {
    it('should reject connections when maxConnections is reached', async () => {
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger, maxConnections: 1 });

      const { ticketId: t1 } = await server.issueTicket(testSettings);
      const ws1 = await connectClient(server, `/?ticket=${t1}`);
      expect(ws1.close).not.toHaveBeenCalledWith(4429, expect.any(String));
      expect(server.getActiveConnections()).toBe(1);

      const { ticketId: t2 } = await server.issueTicket(testSettings);
      const ws2 = await connectClient(server, `/?ticket=${t2}`);
      expect(ws2.close).toHaveBeenCalledWith(4429, 'Maximum connections reached');
    });

    it('should allow unlimited connections when maxConnections is 0', async () => {
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger, maxConnections: 0 });

      const { ticketId: t1 } = await server.issueTicket(testSettings);
      const ws1 = await connectClient(server, `/?ticket=${t1}`);
      expect(ws1.close).not.toHaveBeenCalledWith(4429, expect.any(String));

      const { ticketId: t2 } = await server.issueTicket(testSettings);
      const ws2 = await connectClient(server, `/?ticket=${t2}`);
      expect(ws2.close).not.toHaveBeenCalledWith(4429, expect.any(String));
    });
  });

  describe('maxJoinedPerSession', () => {
    it('should reject join when maxJoinedPerSession is reached', async () => {
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger, maxJoinedPerSession: 2, allowJoin: true });

      const { ticketId: t1 } = await server.issueTicket(testSettings);
      await connectClient(server, `/?ticket=${t1}`);

      const guacd = mockGuacdClientInstances[mockGuacdClientInstances.length - 1];
      guacd.guacamoleConnectionId = '$shared-session';
      guacd.emit('open', guacd);
      await new Promise<void>((r) => setTimeout(r, 0));

      const joinSettings: ConnectionSettings = {
        type: 'rdp',
        join: '$shared-session',
        settings: {},
      };

      const { ticketId: t2 } = await server.issueTicket(joinSettings);
      await connectClient(server, `/?ticket=${t2}`);

      const { ticketId: t3 } = await server.issueTicket(joinSettings);
      const ws3 = await connectClient(server, `/?ticket=${t3}`);
      expect(ws3.close).toHaveBeenCalledWith(4429, 'Maximum participants per session reached');
    });

    it('should allow join when under maxJoinedPerSession limit', async () => {
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger, maxJoinedPerSession: 5, allowJoin: true });

      const { ticketId: t1 } = await server.issueTicket(testSettings);
      await connectClient(server, `/?ticket=${t1}`);

      const guacd = mockGuacdClientInstances[mockGuacdClientInstances.length - 1];
      guacd.guacamoleConnectionId = '$shared-session';
      guacd.emit('open', guacd);
      await new Promise<void>((r) => setTimeout(r, 0));

      const joinSettings: ConnectionSettings = {
        type: 'rdp',
        join: '$shared-session',
        settings: {},
      };

      const { ticketId: t2 } = await server.issueTicket(joinSettings);
      const ws2 = await connectClient(server, `/?ticket=${t2}`);
      expect(ws2.close).not.toHaveBeenCalledWith(4429, expect.any(String));
    });
  });

  describe('joinSession', () => {
    it('should return a ticket for a joinable connection', async () => {
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger, allowJoin: true });

      const { ticketId: t1 } = await server.issueTicket(testSettings);
      await connectClient(server, `/?ticket=${t1}`);
      const guacd = mockGuacdClientInstances[mockGuacdClientInstances.length - 1];
      guacd.guacamoleConnectionId = '$shared-session';
      guacd.emit('open', guacd);
      await new Promise<void>((r) => setTimeout(r, 0));

      const list = server.getConnectionList();
      const ticket = await server.joinSession(list[0].connectionId);
      expect(ticket.ticketId).toBeDefined();
      expect(ticket.expiresAt).toBeDefined();
    });

    it('should throw when connection does not exist', async () => {
      await expect(server.joinSession('nonexistent')).rejects.toThrow('Connection nonexistent is not available');
    });

    it('should throw when connection is not ready', async () => {
      const { ticketId } = await server.issueTicket(testSettings);
      await connectClient(server, `/?ticket=${ticketId}`);
      const list = server.getConnectionList();
      const conn = list[0];
      (conn as unknown as { guacamoleConnectionId: undefined }).guacamoleConnectionId = undefined;
      await expect(server.joinSession(conn.connectionId)).rejects.toThrow('is not available');
    });

    it('should throw when allowJoin is false', async () => {
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger });

      const { ticketId } = await server.issueTicket(testSettings);
      await connectClient(server, `/?ticket=${ticketId}`);
      const guacd = mockGuacdClientInstances[mockGuacdClientInstances.length - 1];
      guacd.guacamoleConnectionId = '$shared-session';
      guacd.emit('open', guacd);
      await new Promise<void>((r) => setTimeout(r, 0));

      const list = server.getConnectionList();
      await expect(server.joinSession(list[0].connectionId)).rejects.toThrow('Session sharing not allowed');
    });

    it('should allow join when per-session allowJoin overrides server default', async () => {
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger });

      const { ticketId } = await server.issueTicket({ ...testSettings, allowJoin: true });
      await connectClient(server, `/?ticket=${ticketId}`);
      const guacd = mockGuacdClientInstances[mockGuacdClientInstances.length - 1];
      guacd.guacamoleConnectionId = '$shared-session';
      guacd.emit('open', guacd);
      await new Promise<void>((r) => setTimeout(r, 0));

      const list = server.getConnectionList();
      const ticket = await server.joinSession(list[0].connectionId);
      expect(ticket.ticketId).toBeDefined();
    });
  });

  describe('allowJoin', () => {
    const joinSettings: ConnectionSettings = {
      type: 'rdp',
      join: '$shared-session',
      settings: {},
    };

    async function setupOriginalConnection(srv: GuacamoleServer, settings: ConnectionSettings = testSettings): Promise<void> {
      const { ticketId } = await srv.issueTicket(settings);
      await connectClient(srv, `/?ticket=${ticketId}`);
      const guacd = mockGuacdClientInstances[mockGuacdClientInstances.length - 1];
      guacd.guacamoleConnectionId = '$shared-session';
      guacd.emit('open', guacd);
      await new Promise<void>((r) => setTimeout(r, 0));
    }

    it('should reject join when allowJoin defaults to false', async () => {
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger });
      await setupOriginalConnection(server);

      const { ticketId } = await server.issueTicket(joinSettings);
      const ws = await connectClient(server, `/?ticket=${ticketId}`);
      expect(ws.close).toHaveBeenCalledWith(4403, 'Session sharing not allowed');
    });

    it('should allow join when server-wide allowJoin is true', async () => {
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger, allowJoin: true });
      await setupOriginalConnection(server);

      const { ticketId } = await server.issueTicket(joinSettings);
      const ws = await connectClient(server, `/?ticket=${ticketId}`);
      expect(ws.close).not.toHaveBeenCalledWith(4403, expect.any(String));
    });

    it('should allow join when per-session allowJoin overrides server default', async () => {
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger });
      await setupOriginalConnection(server, { ...testSettings, allowJoin: true });

      const { ticketId } = await server.issueTicket(joinSettings);
      const ws = await connectClient(server, `/?ticket=${ticketId}`);
      expect(ws.close).not.toHaveBeenCalledWith(4403, expect.any(String));
    });

    it('should reject join when per-session allowJoin overrides server default', async () => {
      await server.close();
      server = new GuacamoleServer({ logger: mockLogger, allowJoin: true });
      await setupOriginalConnection(server, { ...testSettings, allowJoin: false });

      const { ticketId } = await server.issueTicket(joinSettings);
      const ws = await connectClient(server, `/?ticket=${ticketId}`);
      expect(ws.close).toHaveBeenCalledWith(4403, 'Session sharing not allowed');
    });
  });

  describe('events', () => {
    it('should emit open when connection is ready', async () => {
      const openHandler = jest.fn();
      server.on('open', openHandler);
      const { ticketId } = await server.issueTicket(testSettings);
      await connectClient(server, `/?ticket=${ticketId}`);

      const guacd = mockGuacdClientInstances[mockGuacdClientInstances.length - 1];
      if (guacd) {
        guacd.emit('open', guacd);
      }
      await new Promise((r) => setTimeout(r, 0));
    });
  });
});
