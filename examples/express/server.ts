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

// API Routes

/**
 * Issue session ID and store connection settings server-side
 * POST /api/session
 */
app.post('/api/session', async (req, res) => {
  try {
    const {
      protocol,
      hostname,
      port,
      username,
      password,
      domain,
      width,
      height,
      security,
      'ignore-cert': ignoreCert,
    } = req.body;

    if (!protocol || !hostname) {
      return res.status(400).json({
        error: 'Missing required fields: protocol and hostname are required',
      });
    }

    // Use Protocol Builders for type-safe connection
    let connectionSettings: ConnectionSettings;

    if (protocol === 'rdp') {
      const targetHost = hostname || 'rdp';
      const builder = createConnectionBuilder('rdp')
        .hostname(targetHost)
        .port(port || 3389)
        .security(security || 'any')
        .ignoreCert(ignoreCert !== false)
        .colorDepth(24);

      if (!username || !password) {
        return res.status(400).json({
          error: 'Username and password are required for RDP',
        });
      }

      builder.username(username);
      builder.password(password);
      // Set sane display defaults to avoid 0x0 resolution
      if (domain) builder.domain(domain);

      const validation = builder.validate();
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid connection parameters',
          details: validation.errors,
        });
      }

      connectionSettings = builder.build();
      // Ensure required fields are present in settings
      connectionSettings.settings.hostname = connectionSettings.settings.hostname || targetHost;
      connectionSettings.settings.port = connectionSettings.settings.port || 3389;
      if (!connectionSettings.settings.security) {
        connectionSettings.settings.security = 'any';
      }
      // Ensure display params are present
      if (connectionSettings.settings.width === undefined) {
        connectionSettings.settings.width = width || 1280;
      }
      if (connectionSettings.settings.height === undefined) {
        connectionSettings.settings.height = height || 720;
      }
      if (connectionSettings.settings.dpi === undefined) {
        connectionSettings.settings.dpi = 96;
      }
    } else if (protocol === 'vnc') {
      const builder = createConnectionBuilder('vnc')
        .hostname(hostname)
        .port(port || 5900);

      if (password) builder.password(password);

      const validation = builder.validate();
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid connection parameters',
          details: validation.errors,
        });
      }

      connectionSettings = builder.build();
    } else if (protocol === 'ssh') {
      const builder = createConnectionBuilder('ssh')
        .hostname(hostname)
        .port(port || 22);

      if (username) builder.username(username);
      if (password) builder.password(password);

      const validation = builder.validate();
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid connection parameters',
          details: validation.errors,
        });
      }

      connectionSettings = builder.build();
    } else {
      return res.status(400).json({
        error: 'Unsupported protocol. Use: rdp, vnc, or ssh',
      });
    }

    // Issue session ID and keep connection details server-side
    const sessionId = await guacdServer.issueSession(connectionSettings, SESSION_TTL_MS);
    const wsHost = req.get('host') || `localhost:${PORT}`;
    const wsUrl = `ws://${wsHost}/?sessionId=${encodeURIComponent(sessionId)}`;
    const wsBase = `ws://${wsHost}/`;

    res.json({
      success: true,
      sessionId,
      wsUrl,
      wsBase,
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
