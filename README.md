# guacd-ts

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D16.0.0-green)](https://nodejs.org/)

Production-ready TypeScript library for bridging WebSocket connections to Apache Guacamole guacd daemon.

## Features

- **TypeScript First** - Full type safety with comprehensive type definitions  
- **Production Ready** - Built for enterprise use with security and maintainability in mind  
- **Flexible Integration** - Works standalone or with Express/Fastify  
- **Session Management** - Built-in session issuance (session ID + TTL) with pluggable storage (Redis, etc.)  
- **Security Focused** - Server-side stored session data, optional token compatibility, cookie validation, connection authentication  
- **Event-Driven** - Hooks for connection lifecycle (before connect, after disconnect)  
- **Well Tested** - Comprehensive test suite with Jest  
- **Protocol Support** - RDP, VNC, SSH, Telnet

## Installation

```bash
npm install guacd-ts
```

## Prerequisites

You need a running `guacd` instance. The easiest way is using Docker:

```bash
docker run -d -p 4822:4822 guacamole/guacd
```

## Quick Start

### Standalone Server (session ID flow)

```typescript
import { GuacdServer } from 'guacd-ts';

const server = new GuacdServer(
  { port: 8080 },
  { host: '127.0.0.1', port: 4822 },
  {
    log: { level: 'INFO' },
  }
);

// Issue a session ID and store connection info server-side
const sessionId = await server.issueSession({
  type: 'rdp',
  settings: {
    hostname: '192.168.1.100',
    username: 'Administrator',
    password: 'password',
    port: 3389,
    'ignore-cert': true,
  },
});

// Client connects with the issued sessionId
console.log(`ws://localhost:8080/?sessionId=${encodeURIComponent(sessionId)}`);
```

### Express Integration

```typescript
import express from 'express';
import { createServer } from 'http';
import { GuacdServer } from 'guacd-ts';

const app = express();
const httpServer = createServer(app);

const guacdServer = new GuacdServer({ server: httpServer }, { host: '127.0.0.1', port: 4822 }, {});

httpServer.listen(3000);
```

### Fastify Integration

```typescript
import Fastify from 'fastify';
import { GuacdServer } from 'guacd-ts';

const fastify = Fastify();

const guacdServer = new GuacdServer({ server: fastify.server }, { host: '127.0.0.1', port: 4822 }, {});

await fastify.listen({ port: 3000 });
```

## Advanced Features

### Session Issuance API

```typescript
// Service issues a session and hands sessionId to the client
const sessionId = await server.issueSession(
  {
    type: 'rdp',
    settings: {
      hostname: '192.168.1.100',
      username: 'Administrator',
      password: 'password',
      'ignore-cert': true,
    },
  },
  10 * 60 * 1000, // TTL (ms)
  { host: '127.0.0.1', port: 4822 } // optional guacd target override
);
```

Clients connect via `?sessionId=<issued id>` (or `Authorization: Bearer <id>` / `X-Session-Id` header). The server loads the stored settings and starts the guacd bridge.

### Cookie Validation (Before Connect)

```typescript
const server = new GuacdServer(
  { port: 8080 },
  { host: '127.0.0.1', port: 4822 },
  {
    crypt: {
      cypher: 'AES-256-CBC',
      key: 'MySuperSecretKeyForParamsToken12',
    },
  },
  {
    validateCookies: (cookies, callback) => {
      // Validate session cookie
      const isValid = validateSessionCookie(cookies);
      callback(undefined, isValid);
    },
  }
);
```

### Connection Lifecycle Events

```typescript
server.on('open', (connection) => {
  console.log(`Connection opened: ${connection.connectionId}`);
  // Log to database, send notification, etc.
});

server.on('close', (connection, error) => {
  console.log(`Connection closed: ${connection.connectionId}`);
  // Cleanup resources, log session duration, etc.
});

server.on('error', (connection, error) => {
  console.error(`Connection error: ${error.message}`);
  // Send alert, log error, etc.
});
```

### Session Management with Redis

```typescript
import { createClient } from 'redis';
import { GuacdServer, SessionRegistry, SessionData } from 'guacd-ts';

class RedisSessionRegistry implements SessionRegistry {
  constructor(private client: RedisClientType) {}

  async get(sessionId: string): Promise<SessionData | null> {
    const data = await this.client.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async set(sessionId: string, data: SessionData): Promise<void> {
    await this.client.setEx(`session:${sessionId}`, 86400, JSON.stringify(data));
  }

  async delete(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`);
  }
}

const redisClient = createClient();
await redisClient.connect();

const server = new GuacdServer(
  { port: 8080 },
  { host: '127.0.0.1', port: 4822 },
  {
    crypt: {
      cypher: 'AES-256-CBC',
      key: 'MySuperSecretKeyForParamsToken12',
    },
  },
  {
    sessionRegistry: new RedisSessionRegistry(redisClient),
  }
);
```

### Dynamic Guacd Routing

```typescript
// Route connections to different guacd instances per session
const sessionId = await server.issueSession(
  {
    type: 'rdp',
    settings: {
      hostname: '10.0.1.100',
      username: 'admin',
    },
  },
  undefined,
  { host: 'guacd-us-east.example.com', port: 4822 }
);
```

### Join Existing Session

```typescript
// Join an active session (for screen sharing, collaboration)
const joinSessionId = await server.issueSession({
  join: '$b447679c-0541-4b3d-821b-74389e9dfb16', // Session ID
  settings: {
    'read-only': true,
  },
});
```

## Configuration

### WebSocket Options

```typescript
{
  port: 8080,           // WebSocket server port
  server: httpServer,   // Or use existing HTTP server
}
```

### Guacd Options

```typescript
{
  host: '127.0.0.1',    // guacd host
  port: 4822,           // guacd port
}
```

### Client Options

```typescript
{
  // crypt is only required for legacy token-based connections
  crypt?: {
    cypher: 'AES-256-CBC',
    key: 'your-32-byte-secret-key-here!!',
  },
  maxInactivityTime: 10000,  // Close connection after 10s inactivity
  log: {
    level: 'INFO',           // ERROR, WARN, INFO, DEBUG, VERBOSE
    stdLog: console.log,
    errorLog: console.error,
  },
  connectionDefaultSettings: {
    rdp: {
      port: '3389',
      width: 1920,
      height: 1080,
    },
  },
}
```

## Security Considerations

- Keep credentials server-side with session IDs; avoid sending raw credentials to clients  
- Use short TTLs for sessions and revoke/clean expired sessions  
- Validate cookies before connecting (`validateCookies` callback)  
- Implement rate limiting to protect against connection flooding  
- Use HTTPS/WSS in production  

## Protocol Support

### RDP (Remote Desktop Protocol)

```typescript
{
  type: 'rdp',
  settings: {
    hostname: '192.168.1.100',
    username: 'Administrator',
    password: 'password',
    port: 3389,
    'ignore-cert': true,
    security: 'any',
  },
}
```

### VNC (Virtual Network Computing)

```typescript
{
  type: 'vnc',
  settings: {
    hostname: '192.168.1.100',
    password: 'password',
    port: 5900,
  },
}
```

### SSH (Secure Shell)

```typescript
{
  type: 'ssh',
  settings: {
    hostname: '192.168.1.100',
    username: 'root',
    password: 'password',
    port: 22,
  },
}
```

## Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Development

```bash
npm run build         # Build TypeScript
npm run lint          # Run ESLint
npm run format        # Format with Prettier
```

## Examples

See the [examples](./examples) directory for complete working examples:

- [Standalone server](./examples/standalone.ts)
- [Express integration](./examples/express-integration.ts)
- [Fastify integration](./examples/fastify-integration.ts)
- [Redis session management](./examples/session-management.ts)

## API Reference

### GuacdServer

Main server class for managing WebSocket connections.

```typescript
class GuacdServer extends EventEmitter {
  constructor(
    wsOptions: WebSocketOptions,
    guacdOptions: GuacdOptions,
    clientOptions: ClientOptions,
    callbacks?: Callbacks
  );

  close(): void;
  getActiveConnectionsCount(): number;
  getSessionRegistry(): SessionRegistry;
}
```

### Events

- `open` - Connection established
- `close` - Connection closed
- `error` - Connection error

## Contributing

Contributions are welcome! Please read our contributing guidelines.

## License

Apache License 2.0 - See [LICENSE](./LICENSE) file for details.

## Acknowledgements

This project is inspired by [guacamole-lite](https://github.com/vadimpronin/guacamole-lite) and built for production use with TypeScript.

## Related Projects

- [Apache Guacamole](https://guacamole.apache.org/) - Clientless remote desktop gateway
- [guacamole-common-js](https://github.com/apache/guacamole-client) - JavaScript Guacamole client

## Support

- 📖 [Documentation](./docs)
- 🐛 [Issue Tracker](https://github.com/YasushiMatsumoto/guacd-ts/issues)
- 💬 [Discussions](https://github.com/YasushiMatsumoto/guacd-ts/discussions)
