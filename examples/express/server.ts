/**
 * Express Integration Example
 *
 * This example demonstrates how to integrate guacd-ts with Express.
 * It provides a REST API for token generation and WebSocket endpoint for connections.
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
import { GuacdServer, Crypt, createConnectionBuilder } from '../../src';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'MySuperSecretKeyForParamsToken12';
const PORT = process.env.PORT || 3000;

// Initialize GuacdServer
const guacdServer = new GuacdServer(
  {
    server: httpServer, // Attach to Express HTTP server
  },
  {
    host: process.env.GUACD_HOST || '127.0.0.1',
    port: parseInt(process.env.GUACD_PORT || '4822'),
  },
  {
    crypt: {
      cypher: 'AES-256-CBC',
      key: ENCRYPTION_KEY,
    },
    log: {
      level: 'INFO',
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
 * Generate encrypted connection token
 * POST /api/token
 */
app.post('/api/token', (req, res) => {
  try {
    const { protocol, hostname, port, username, password, domain } = req.body;

    if (!protocol || !hostname) {
      return res.status(400).json({
        error: 'Missing required fields: protocol and hostname are required',
      });
    }

    // Use Protocol Builders for type-safe connection
    let connectionSettings;

    if (protocol === 'rdp') {
      const builder = createConnectionBuilder('rdp')
        .hostname(hostname)
        .port(port || 3389);

      if (username) builder.username(username);
      if (password) builder.password(password);
      if (domain) builder.domain(domain);

      const validation = builder.validate();
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid connection parameters',
          details: validation.errors,
        });
      }

      connectionSettings = builder.build();
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

    // Encrypt the connection settings
    const crypt = new Crypt('AES-256-CBC', ENCRYPTION_KEY);
    const token = crypt.encrypt({
      connection: connectionSettings,
    });

    res.json({
      success: true,
      token,
      wsUrl: `ws://localhost:${PORT}/?token=${encodeURIComponent(token)}`,
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({
      error: 'Failed to generate token',
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
  console.log('\n🚀 Express + Guacd-TS Server Started!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📱 Web Interface: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(
    `🖥️  Guacd: ${process.env.GUACD_HOST || '127.0.0.1'}:${process.env.GUACD_PORT || '4822'}`
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nAPI Endpoints:');
  console.log('  POST /api/token  - Generate connection token');
  console.log('  GET  /api/stats  - Get server statistics');
  console.log('  GET  /api/health - Health check');
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
