/**
 * Express Integration Example (session ID flow)
 *
 * This example demonstrates how to integrate guacd-ts with Express.
 * It provides a REST API for session issuance and a WebSocket endpoint for connections.
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
import { ConnectionSettings, GuacdServer, createConnectionBuilder } from '../../src';

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

const PORT = process.env.PORT || 3000;
const SESSION_TTL_MS = parseInt(process.env.SESSION_TTL_MS || '600000', 10); // default 10 minutes

// RDP safe defaults (avoid black screen on initial connection)
const RDP_INITIAL_WIDTH = parseInt(process.env.RDP_INITIAL_WIDTH || '1280', 10);
const RDP_INITIAL_HEIGHT = parseInt(process.env.RDP_INITIAL_HEIGHT || '720', 10);
const RDP_DPI = parseInt(process.env.RDP_DPI || '96', 10);
const RDP_COLOR_DEPTH = parseInt(process.env.RDP_COLOR_DEPTH || '24', 10);

// Initialize GuacdServer
const guacdServer = new GuacdServer(
  {
    server: httpServer, // Attach to Express HTTP server
  },
  {
    host: process.env.GUACD_HOST || '127.0.0.1',
    port: parseInt(process.env.GUACD_PORT || '4822', 10),
  },
  {
    log: {
      level: 'DEBUG',
    },
    maxInactivityTime: 60000,
  }
);

// Connection event listeners
guacdServer.on('open', (connection) => {
  console.log(`[${new Date().toISOString()}] Connection opened: ${connection.connectionId}`);
});

guacdServer.on('close', (connection, error) => {
  if (error) {
    console.error(`[${new Date().toISOString()}] Connection closed with error: ${error.message}`);
  } else {
    console.log(`[${new Date().toISOString()}] Connection closed: ${connection.connectionId}`);
  }
});

guacdServer.on('error', (connection, error) => {
  console.error(`[${new Date().toISOString()}] Connection error: ${error.message}`);
});

function sanitizeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = typeof value === 'string' ? parseInt(value, 10) : (value as number);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function logIssuedSession(connectionSettings: ConnectionSettings, sessionId: string) {
  // Log only non-sensitive values (avoid printing password)
  const s: Record<string, unknown> = { ...(connectionSettings.settings as any) };
  if ('password' in s) s.password = '***';
  if ('sftp-password' in s) (s as any)['sftp-password'] = '***';
  if ('gateway-password' in s) (s as any)['gateway-password'] = '***';

  console.log(`[${new Date().toISOString()}] Issued sessionId=${sessionId}`);
  console.log(`[${new Date().toISOString()}] Connection settings (sanitized):`);
  console.log(JSON.stringify(s, null, 2));
}

// API Routes

/**
 * Issue session ID and store connection settings server-side
 * POST /api/session
 */
app.post('/api/session', async (req, res) => {
  try {
    const body = req.body ?? {};

    const protocol = body.protocol as string | undefined;
    const hostname = body.hostname as string | undefined;
    const port = sanitizeNumber(body.port);

    const username = body.username as string | undefined;
    const password = body.password as string | undefined;
    const domain = body.domain as string | undefined;

    const width = sanitizeNumber(body.width);
    const height = sanitizeNumber(body.height);

    const serverLayout = body['server-layout'] as string | undefined;
    const ignoreCert = body['ignore-cert'] as boolean | undefined;
    const enableWallpaper = body['enable-wallpaper'] as boolean | undefined;

    const cursor = body.cursor as string | undefined;
    const swapRedBlue = body['swap-red-blue'] as boolean | undefined;
    const readOnly = body['read-only'] as boolean | undefined;
    const disableCopy = body['disable-copy'] as boolean | undefined;
    const disablePaste = body['disable-paste'] as boolean | undefined;
    const colorDepth = sanitizeNumber(body['color-depth']);

    if (!protocol || !hostname) {
      return res.status(400).json({
        error: 'Missing required fields: protocol and hostname are required',
      });
    }

    let connectionSettings: ConnectionSettings;

    switch (protocol) {
      case 'rdp': {
        // IMPORTANT:
        // - Do NOT use browser-provided width/height for initial connection.
        // - Use safe fixed initial size to avoid black screen issues.
        const targetHost = hostname || 'rdp';

        if (!username || !password) {
          return res.status(400).json({
            error: 'Username and password are required for RDP',
          });
        }

        const builder = createConnectionBuilder('rdp')
          .hostname(targetHost)
          .port(port || 3389)
          .security('any')
          .ignoreCert(ignoreCert !== false)
          .colorDepth(RDP_COLOR_DEPTH as any)
          .dpi(RDP_DPI)
          .resize('display-update')
          .username(username)
          .password(password);

        // Force safe initial display (ignore req.width/req.height on initial connect)
        builder.width(RDP_INITIAL_WIDTH);
        builder.height(RDP_INITIAL_HEIGHT);

        if (domain) builder.domain(domain);

        // Keylayout: prefer caller value, otherwise use a deterministic default
        // NOTE: If this value is wrong for your stack, you'll see it in logs immediately.
        builder.withParams({
          'server-layout': serverLayout || 'ja-jp-qwerty',
          'disable-gfx': true,
          'enable-desktop-composition': false,
          'enable-menu-animations': false,
        });

        if (enableWallpaper !== undefined) {
          builder.performanceFlags({ wallpaper: Boolean(enableWallpaper) });
        }

        const validation = builder.validate();
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Invalid connection parameters',
            details: validation.errors,
          });
        }

        connectionSettings = builder.build();
        break;
      }

      case 'vnc': {
        const builder = createConnectionBuilder('vnc')
          .hostname(hostname)
          .port(port || 5900);

        if (username) builder.username(username);
        if (password) builder.password(password);
        if (cursor) builder.cursor(cursor as any);
        if (colorDepth) builder.colorDepth(colorDepth as any);
        if (swapRedBlue !== undefined) builder.swapRedBlue(Boolean(swapRedBlue));
        if (readOnly !== undefined) builder.readOnly(Boolean(readOnly));
        if (disableCopy !== undefined) builder.disableCopy(Boolean(disableCopy));
        if (disablePaste !== undefined) builder.disablePaste(Boolean(disablePaste));

        const validation = builder.validate();
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Invalid connection parameters',
            details: validation.errors,
          });
        }

        connectionSettings = builder.build();
        break;
      }

      case 'ssh': {
        const builder = createConnectionBuilder('ssh')
          .hostname(hostname)
          .port(port || 22);

        if (username) builder.username(username);
        if (password) builder.password(password);

        // Terminal/display tuning
        builder.width(width || 1280);
        builder.height(height || 720);
        builder.dpi(96);
        builder.font('monospace', 12);
        builder.scrollback(1000);
        builder.colorScheme('green-black');

        const validation = builder.validate();
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Invalid connection parameters',
            details: validation.errors,
          });
        }

        connectionSettings = builder.build();
        break;
      }

      case 'telnet': {
        const builder = createConnectionBuilder('telnet')
          .hostname(hostname)
          .port(port || 23);

        if (username) builder.username(username);
        if (password) builder.password(password);

        builder.width(width || 1280);
        builder.height(height || 720);
        builder.dpi(96);
        builder.font('monospace', 12);
        builder.scrollback(1000);
        builder.colorScheme('gray-black');

        const validation = builder.validate();
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Invalid connection parameters',
            details: validation.errors,
          });
        }

        connectionSettings = builder.build();
        break;
      }

      default:
        return res.status(400).json({
          error: 'Unsupported protocol. Use: rdp, vnc, ssh, or telnet',
        });
    }

    // Issue session ID and keep connection details server-side
    const sessionId = await guacdServer.issueSession(connectionSettings, SESSION_TTL_MS);

    // Log issued session with sanitized settings
    logIssuedSession(connectionSettings, sessionId);

    const wsHost = req.get('host') || `localhost:${PORT}`;
    const wsBase = `ws://${wsHost}/ws`;

    res.json({
      success: true,
      sessionId,
      wsBase,
      // For visibility/debug: tell client what initial RDP size is (non-binding)
      rdpInitial:
        protocol === 'rdp'
          ? { width: RDP_INITIAL_WIDTH, height: RDP_INITIAL_HEIGHT, dpi: RDP_DPI }
          : undefined,
    });
  } catch (error) {
    console.error('Session issuance error:', error);
    res.status(500).json({
      error: 'Failed to issue session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get server statistics
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  res.json({
    activeConnections: guacdServer.getActiveConnectionsCount(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/**
 * Health check endpoint
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Serve index page
 * GET /
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
httpServer.listen(PORT, () => {
  console.log('\nExpress + Guacd-TS Server Started');
  console.log('---------------------------------------------');
  console.log(`Web Interface: http://localhost:${PORT}`);
  console.log(`WebSocket:    ws://localhost:${PORT}`);
  console.log(
    `Guacd:        ${process.env.GUACD_HOST || '127.0.0.1'}:${process.env.GUACD_PORT || '4822'}`
  );
  console.log(
    `RDP initial:  ${RDP_INITIAL_WIDTH}x${RDP_INITIAL_HEIGHT} dpi=${RDP_DPI} bpp=${RDP_COLOR_DEPTH}`
  );
  console.log('---------------------------------------------');
  console.log('\nAPI Endpoints:');
  console.log('  POST /api/session - Issue session ID and WebSocket URL');
  console.log('  GET  /api/stats   - Get server statistics');
  console.log('  GET  /api/health  - Health check');
  console.log('\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    guacdServer.close();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  httpServer.close(() => {
    guacdServer.close();
    console.log('Server closed');
    process.exit(0);
  });
});
