/**
 * Express Integration Example (ticket-based flow)
 *
 * This example demonstrates how to integrate guacd-ts with Express.
 * It provides a REST API for ticket issuance and a WebSocket endpoint
 * handled via {@link GuacamoleServer.attach}.
 *
 * Prerequisites:
 * - guacd running on localhost:4822
 * - npm install express
 *
 * Run: npx ts-node examples/express/server.ts
 * Then open: http://localhost:3000
 */

import express from 'express';
import { createServer } from 'http';
import path from 'path';
import type { ConnectionSettings } from '../../src';
import { GuacamoleServer, createConnectionBuilder } from '../../src';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Serve bundled guacamole-common-js from local node_modules to avoid CDN issues
app.use(
  '/vendor/guacamole-common-js',
  express.static(path.join(__dirname, 'node_modules', 'guacamole-common-js', 'dist'))
);

const PORT = process.env.PORT ?? 3000;
const TICKET_TTL_MS = parseInt(process.env.TICKET_TTL_MS ?? '300000', 10); // 5 min

// RDP safe defaults (avoid black screen on initial connection)
const RDP_INITIAL_WIDTH = parseInt(process.env.RDP_INITIAL_WIDTH ?? '1280', 10);
const RDP_INITIAL_HEIGHT = parseInt(process.env.RDP_INITIAL_HEIGHT ?? '720', 10);
const RDP_DPI = parseInt(process.env.RDP_DPI ?? '96', 10);
const RDP_COLOR_DEPTH = parseInt(process.env.RDP_COLOR_DEPTH ?? '24', 10) as 8 | 16 | 24 | 32;

// Initialize GuacamoleServer with the new ticket-based API
const guac = new GuacamoleServer({
  guacd: {
    host: process.env.GUACD_HOST ?? '127.0.0.1',
    port: parseInt(process.env.GUACD_PORT ?? '4822', 10),
  },
  log: {
    level: 'DEBUG',
  },
  maxInactivityTime: 60_000,
  defaultTicketTtlMs: TICKET_TTL_MS,
  hooks: {
    onConnect(connection) {
      console.log(
        `[${new Date().toISOString()}] Connection opened: ${String(connection.connectionId)}`
      );
    },
    onDisconnect(connection, reason) {
      if (reason) {
        console.error(`[${new Date().toISOString()}] Connection closed with error: ${reason}`);
      } else {
        console.log(
          `[${new Date().toISOString()}] Connection closed: ${String(connection.connectionId)}`
        );
      }
    },
    onError(_connection, error) {
      console.error(`[${new Date().toISOString()}] Connection error: ${error.message}`);
    },
  },
});

// Attach the WebSocket upgrade handler to path /ws
guac.attach(httpServer, '/ws');

function sanitizeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function logIssuedTicket(connectionSettings: ConnectionSettings, ticketId: string): void {
  // Log only non-sensitive values (avoid printing password)
  const s: Record<string, unknown> = {
    ...(connectionSettings.settings as Record<string, unknown>),
  };
  if ('password' in s) s['password'] = '***';
  if ('sftp-password' in s) s['sftp-password'] = '***';
  if ('gateway-password' in s) s['gateway-password'] = '***';

  console.log(`[${new Date().toISOString()}] Issued ticketId=${ticketId}`);
  console.log(`[${new Date().toISOString()}] Connection settings (sanitized):`);
  console.log(JSON.stringify(s, null, 2));
}

// API Routes

/**
 * Issue a ticket and return the ticket ID + WebSocket URL.
 * POST /api/ticket
 */
app.post('/api/ticket', (req, res) => {
  void (async () => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;

      const protocol = body['protocol'] as string | undefined;
      const hostname = body['hostname'] as string | undefined;
      const port = sanitizeNumber(body['port']);

      const username = body['username'] as string | undefined;
      const password = body['password'] as string | undefined;
      const domain = body['domain'] as string | undefined;

      const width = sanitizeNumber(body['width']);
      const height = sanitizeNumber(body['height']);

      const serverLayout = body['server-layout'] as string | undefined;
      const ignoreCert = body['ignore-cert'] as boolean | undefined;
      const enableWallpaper = body['enable-wallpaper'] as boolean | undefined;

      const cursor = body['cursor'] as string | undefined;
      const swapRedBlue = body['swap-red-blue'] as boolean | undefined;
      const readOnly = body['read-only'] as boolean | undefined;
      const disableCopy = body['disable-copy'] as boolean | undefined;
      const disablePaste = body['disable-paste'] as boolean | undefined;
      const colorDepth = sanitizeNumber(body['color-depth']);

      if (!protocol || !hostname) {
        res.status(400).json({
          error: 'Missing required fields: protocol and hostname are required',
        });
        return;
      }

      let connectionSettings: ConnectionSettings;

      switch (protocol) {
        case 'rdp': {
          const targetHost = hostname;

          if (!username || !password) {
            res.status(400).json({
              error: 'Username and password are required for RDP',
            });
            return;
          }

          const builder = createConnectionBuilder('rdp')
            .hostname(targetHost)
            .port(port ?? 3389)
            .security('any')
            .ignoreCert(ignoreCert !== false)
            .colorDepth(RDP_COLOR_DEPTH)
            .dpi(RDP_DPI)
            .resize('display-update')
            .username(username)
            .password(password);

          // Force safe initial display
          builder.width(RDP_INITIAL_WIDTH);
          builder.height(RDP_INITIAL_HEIGHT);

          if (domain) builder.domain(domain);

          builder.withParams({
            'server-layout': serverLayout ?? 'ja-jp-qwerty',
            'disable-gfx': true,
            'enable-desktop-composition': false,
            'enable-menu-animations': false,
          });

          if (enableWallpaper !== undefined) {
            builder.performanceFlags({ wallpaper: Boolean(enableWallpaper) });
          }

          const validation = builder.validate();
          if (!validation.valid) {
            res.status(400).json({
              error: 'Invalid connection parameters',
              details: validation.errors,
            });
            return;
          }

          connectionSettings = builder.build();
          break;
        }

        case 'vnc': {
          const builder = createConnectionBuilder('vnc')
            .hostname(hostname)
            .port(port ?? 5900);

          if (username) builder.username(username);
          if (password) builder.password(password);
          if (cursor) builder.cursor(cursor as 'local' | 'remote');
          if (colorDepth) builder.colorDepth(colorDepth as 8 | 16 | 24 | 32);
          if (swapRedBlue !== undefined) builder.swapRedBlue(Boolean(swapRedBlue));
          if (readOnly !== undefined) builder.readOnly(Boolean(readOnly));
          if (disableCopy !== undefined) builder.disableCopy(Boolean(disableCopy));
          if (disablePaste !== undefined) builder.disablePaste(Boolean(disablePaste));

          const validation = builder.validate();
          if (!validation.valid) {
            res.status(400).json({
              error: 'Invalid connection parameters',
              details: validation.errors,
            });
            return;
          }

          connectionSettings = builder.build();
          break;
        }

        case 'ssh': {
          const builder = createConnectionBuilder('ssh')
            .hostname(hostname)
            .port(port ?? 22);

          if (username) builder.username(username);
          if (password) builder.password(password);

          builder.width(width ?? 1280);
          builder.height(height ?? 720);
          builder.dpi(96);
          builder.font('monospace', 12);
          builder.scrollback(1000);
          builder.colorScheme('green-black');

          const validation = builder.validate();
          if (!validation.valid) {
            res.status(400).json({
              error: 'Invalid connection parameters',
              details: validation.errors,
            });
            return;
          }

          connectionSettings = builder.build();
          break;
        }

        case 'telnet': {
          const builder = createConnectionBuilder('telnet')
            .hostname(hostname)
            .port(port ?? 23);

          if (username) builder.username(username);
          if (password) builder.password(password);

          builder.width(width ?? 1280);
          builder.height(height ?? 720);
          builder.dpi(96);
          builder.font('monospace', 12);
          builder.scrollback(1000);
          builder.colorScheme('gray-black');

          const validation = builder.validate();
          if (!validation.valid) {
            res.status(400).json({
              error: 'Invalid connection parameters',
              details: validation.errors,
            });
            return;
          }

          connectionSettings = builder.build();
          break;
        }

        default:
          res.status(400).json({
            error: 'Unsupported protocol. Use: rdp, vnc, ssh, or telnet',
          });
          return;
      }

      // Issue a one-time ticket (server keeps connection details)
      const ticket = await guac.issueTicket(connectionSettings);

      logIssuedTicket(connectionSettings, ticket.ticketId);

      const wsHost = req.get('host') ?? `localhost:${String(PORT)}`;
      const wsBase = `ws://${wsHost}/ws`;

      res.json({
        success: true,
        ticketId: ticket.ticketId,
        expiresAt: ticket.expiresAt,
        wsUrl: `${wsBase}?ticket=${ticket.ticketId}`,
        // For visibility/debug: tell client what initial RDP size is (non-binding)
        rdpInitial:
          protocol === 'rdp'
            ? { width: RDP_INITIAL_WIDTH, height: RDP_INITIAL_HEIGHT, dpi: RDP_DPI }
            : undefined,
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
 * Get server statistics
 * GET /api/stats
 */
app.get('/api/stats', (_req, res) => {
  res.json({
    activeConnections: guac.getActiveConnections(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/**
 * Health check endpoint
 * GET /api/health
 */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Serve index page
 * GET /
 */
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
httpServer.listen(PORT, () => {
  console.log('\nExpress + Guacd-TS Server Started');
  console.log('---------------------------------------------');
  console.log(`Web Interface: http://localhost:${String(PORT)}`);
  console.log(`WebSocket:    ws://localhost:${String(PORT)}/ws`);
  console.log(
    `Guacd:        ${process.env.GUACD_HOST ?? '127.0.0.1'}:${process.env.GUACD_PORT ?? '4822'}`
  );
  console.log(
    `RDP initial:  ${String(RDP_INITIAL_WIDTH)}x${String(RDP_INITIAL_HEIGHT)} dpi=${String(RDP_DPI)} bpp=${String(RDP_COLOR_DEPTH)}`
  );
  console.log('---------------------------------------------');
  console.log('\nAPI Endpoints:');
  console.log('  POST /api/ticket  - Issue ticket and WebSocket URL');
  console.log('  GET  /api/stats   - Get server statistics');
  console.log('  GET  /api/health  - Health check');
  console.log('\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    void guac.close().then(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  httpServer.close(() => {
    void guac.close().then(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});
