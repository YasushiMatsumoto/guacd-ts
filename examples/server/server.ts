import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { createConnectionBuilder, createDefaultLogger, GuacamoleServer } from 'guacd-ts';

// ─── Express + HTTP server setup ────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const TICKET_TTL_MS = parseInt(process.env.TICKET_TTL_MS ?? '300000', 10);
const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'INFO') as
  'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'VERBOSE';

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ─── GuacamoleServer initialization ─────────────────────────────────────────
// Create a GuacamoleServer instance with guacd connection info and logging.
// By default guacd-ts produces no log output — pass a logger to enable it.
// In production you'd also add lifecycle hooks for authentication, audit, etc.

const guac = new GuacamoleServer({
  guacd: {
    host: process.env.GUACD_HOST ?? '127.0.0.1',
    port: parseInt(process.env.GUACD_PORT ?? '4822', 10),
  },
  logger: createDefaultLogger({ level: LOG_LEVEL }),
  defaultTicketTtlMs: TICKET_TTL_MS,
});

// Attach to the HTTP server at the /ws path.
// WebSocket clients connect to ws://host:port/ws?ticket=<ticketId>.
// When httpServer stops, guacd-ts automatically cleans up all connections.
guac.attach(httpServer, '/ws');

// ─── Protocol builder helper ────────────────────────────────────────────────
// createConnectionBuilder() returns a fluent, type-safe builder for the given
// protocol. Use .withParams() to apply user-supplied settings, then .validate()
// to check for errors before issuing a ticket.

function makeBuilder(protocol: string) {
  switch (protocol) {
    case 'rdp':
      return createConnectionBuilder('rdp');
    case 'vnc':
      return createConnectionBuilder('vnc');
    case 'ssh':
      return createConnectionBuilder('ssh');
    case 'telnet':
      return createConnectionBuilder('telnet');
    default:
      return null;
  }
}

// ─── REST endpoints ─────────────────────────────────────────────────────────

/**
 * POST /api/ticket
 * Body: { protocol: 'rdp' | 'vnc' | 'ssh' | 'telnet', settings: Record<string, unknown> }
 *
 * Flow:
 *   1. Create a builder for the requested protocol
 *   2. Apply user settings and validate them
 *   3. Build the ConnectionSettings and issue a one-time ticket
 *   4. Return the ticket ID and a ready-to-use WebSocket URL
 *
 * The client (guacamole-common-js) connects to the wsUrl, and guacd-ts
 * validates the ticket, consumes it, and bridges WebSocket ↔ guacd.
 */
app.post('/api/ticket', (req, res) => {
  void (async () => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const protocol = body['protocol'] as string | undefined;
      const settings = (body['settings'] ?? {}) as Record<string, unknown>;

      if (!protocol) {
        res.status(400).json({ error: 'Missing required field: protocol' });
        return;
      }

      // 1. Create a protocol builder
      const builder = makeBuilder(protocol);
      if (!builder) {
        res.status(400).json({ error: `Unsupported protocol: ${protocol}` });
        return;
      }

      // 2. Apply settings and validate
      builder.withParams(settings);
      const validation = builder.validate();

      if (!validation.valid) {
        res.status(400).json({ errors: validation.errors, warnings: validation.warnings });
        return;
      }

      // 3. Build and issue the ticket
      const allowJoin = body['allowJoin'] === true;
      const connectionSettings = { ...builder.build(), allowJoin };

      // Redact sensitive values before logging
      const sanitized: Record<string, unknown> = { ...settings };
      for (const key of [
        'password',
        'sftp-password',
        'gateway-password',
        'private-key',
        'passphrase',
      ]) {
        if (key in sanitized) sanitized[key] = '***';
      }
      console.log(`[${new Date().toISOString()}] Issuing ticket for ${protocol}`);
      console.log(JSON.stringify(sanitized, null, 2));

      const ticket = await guac.issueTicket(connectionSettings);

      // 4. Return wsUrl — the client opens a WebSocket to this URL
      const wsHost = `${req.hostname}:${String(PORT)}`;
      res.json({
        ticketId: ticket.ticketId,
        wsUrl: `ws://${wsHost}/ws?ticket=${ticket.ticketId}`,
        expiresAt: ticket.expiresAt,
        warnings: validation.warnings,
      });
    } catch (error) {
      console.error('Ticket issuance error:', error);
      res.status(500).json({
        error: 'Failed to issue ticket',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })();
});

/**
 * POST /api/validate
 * Body: { protocol: string, settings: Record<string, unknown> }
 *
 * Validates settings without issuing a ticket — useful for real-time form
 * feedback before the user clicks "Connect".
 */
app.post('/api/validate', (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const protocol = body['protocol'] as string | undefined;
    const settings = (body['settings'] ?? {}) as Record<string, unknown>;

    if (!protocol) {
      res.status(400).json({ error: 'Missing required field: protocol' });
      return;
    }

    const builder = makeBuilder(protocol);
    if (!builder) {
      res.status(400).json({ error: `Unsupported protocol: ${protocol}` });
      return;
    }

    builder.withParams(settings);
    res.json(builder.validate()); // { valid, errors, warnings }
  } catch (error) {
    res.status(500).json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/connections
 * Returns a list of active connections with their stats.
 * Used by the client to show joinable sessions.
 */
app.get('/api/connections', (_req, res) => {
  const connections = guac.getConnectionList().map((conn) => ({
    connectionId: conn.connectionId,
    guacamoleConnectionId: conn.guacamoleConnectionId,
    protocol: conn.connectionSettings.type,
    allowJoin: conn.connectionSettings.allowJoin ?? false,
    metadata: conn.metadata,
    stats: conn.getStats(),
  }));
  res.json({ connections });
});

/**
 * POST /api/join
 * Body: { connectionId: string }
 *
 * Issues a ticket that joins an existing session (screen sharing).
 * `joinSession()` validates the connection exists, is ready, and allows
 * joining — then returns a one-time ticket.
 */
app.post('/api/join', (req, res) => {
  void (async () => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const connectionId = body['connectionId'] as string | undefined;

      if (connectionId == null) {
        res.status(400).json({ error: 'Missing required field: connectionId' });
        return;
      }

      console.log(`[${new Date().toISOString()}] Joining session ${String(connectionId)}`);

      const ticket = await guac.joinSession(connectionId);

      const wsHost = `${req.hostname}:${String(PORT)}`;
      res.json({
        ticketId: ticket.ticketId,
        wsUrl: `ws://${wsHost}/ws?ticket=${ticket.ticketId}`,
        expiresAt: ticket.expiresAt,
      });
    } catch (error) {
      console.error('Join session error:', error);
      res.status(500).json({
        error: 'Failed to join session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  })();
});

/**
 * GET /api/stats
 * Returns the number of active connections and server resource usage.
 */
app.get('/api/stats', (_req, res) => {
  res.json({
    activeConnections: guac.getActiveConnections(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/**
 * GET /api/health
 * Checks server status and guacd reachability.
 */
app.get('/api/health', (_req, res) => {
  void (async () => {
    const guacdStatus = await guac.checkGuacd();
    res.json({
      status: guacdStatus.ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      guacd: guacdStatus,
    });
  })();
});

// ─── Start ──────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  const guacdHost = process.env.GUACD_HOST ?? '127.0.0.1';
  const guacdPort = process.env.GUACD_PORT ?? '4822';
  console.log('\nguacd-ts example server started');
  console.log('----------------------------------------------');
  console.log(`API:    http://localhost:${String(PORT)}`);
  console.log(`WS:     ws://localhost:${String(PORT)}/ws`);
  console.log(`Guacd:  ${guacdHost}:${guacdPort}`);
  console.log('----------------------------------------------');
  console.log('POST /api/ticket       — issue connection ticket');
  console.log('POST /api/validate     — validate settings');
  console.log('GET  /api/connections  — list active sessions');
  console.log('POST /api/join         — join an existing session');
  console.log('GET  /api/stats        — server statistics');
  console.log('GET  /api/health       — health check');
  console.log('\n');
});

// ─── Graceful shutdown ──────────────────────────────────────────────────────
// httpServer.close() triggers guacd-ts auto-cleanup (via attach()),
// so there's no need to call guac.close() explicitly here.

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing...');
  httpServer.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing...');
  httpServer.close(() => process.exit(0));
});
