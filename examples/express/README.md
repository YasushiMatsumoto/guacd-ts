# Express Integration Example

This example demonstrates how to integrate `guacd-ts` with Express.js to create a web-based remote desktop gateway.

## Features

- ✅ Express HTTP server with WebSocket support
- ✅ REST API for token generation
- ✅ Type-safe connection building with Protocol Builders
- ✅ Interactive web interface
- ✅ Real-time statistics
- ✅ Support for RDP, VNC, and SSH protocols

## Prerequisites

1. **guacd daemon running**

   ```bash
   # Using Docker (recommended)
   docker run -d -p 4822:4822 guacamole/guacd

   # Or install locally
   # Ubuntu/Debian: sudo apt-get install guacd
   # macOS: brew install guacamole-server
   ```

2. **Node.js dependencies**
   ```bash
   npm install express
   ```

## Quick Start

1. **Start the server**

   ```bash
   npx ts-node examples/express/server.ts
   ```

2. **Open browser**

   ```
   http://localhost:3000
   ```

3. **Enter connection details and click Connect**

## Environment Variables

```bash
# Optional configuration
export ENCRYPTION_KEY="your-32-byte-encryption-key!!"
export PORT=3000
export GUACD_HOST=127.0.0.1
export GUACD_PORT=4822
```

## API Endpoints

### POST /api/token

Generate encrypted connection token.

**Request:**

```json
{
  "protocol": "rdp",
  "hostname": "192.168.1.100",
  "port": 3389,
  "username": "Administrator",
  "password": "Password123",
  "domain": "MYDOMAIN"
}
```

**Response:**

```json
{
  "success": true,
  "token": "encrypted_token_here",
  "wsUrl": "ws://localhost:3000/?token=..."
}
```

### GET /api/stats

Get server statistics.

**Response:**

```json
{
  "activeConnections": 2,
  "uptime": 1234.56,
  "memory": { ... }
}
```

### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Usage Example

### Using cURL

```bash
# Generate token
curl -X POST http://localhost:3000/api/token \
  -H "Content-Type: application/json" \
  -d '{
    "protocol": "rdp",
    "hostname": "192.168.1.100",
    "username": "admin",
    "password": "pass123"
  }'

# Connect with Guacamole client
# ws://localhost:3000/?token=YOUR_TOKEN_HERE
```

### Using JavaScript

```javascript
const response = await fetch('http://localhost:3000/api/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    protocol: 'rdp',
    hostname: '192.168.1.100',
    username: 'admin',
    password: 'pass123',
  }),
});

const { token, wsUrl } = await response.json();

// Use with Guacamole client
const tunnel = new Guacamole.WebSocketTunnel(wsUrl);
const client = new Guacamole.Client(tunnel);
client.connect();
```

## Project Structure

```
express/
├── server.ts           # Main Express server
├── public/
│   └── index.html     # Web interface
└── README.md          # This file
```

## Customization

### Add Custom Middleware

```typescript
// Add authentication middleware
app.use('/api/token', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### Add Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Add Request Logging

```typescript
import morgan from 'morgan';

app.use(morgan('combined'));
```

## Security Recommendations

⚠️ **This example is for development/testing purposes**

For production:

- Use HTTPS/WSS instead of HTTP/WS
- Implement proper authentication
- Use environment variables for secrets
- Add rate limiting
- Validate all user inputs
- Use session management
- Add audit logging

## Troubleshooting

### Connection refused

- Ensure guacd is running: `netstat -an | grep 4822`
- Check GUACD_HOST and GUACD_PORT settings

### Token decryption failed

- Verify ENCRYPTION_KEY matches between token generation and server
- Ensure key is exactly 32 bytes for AES-256-CBC

### Display not showing

- Check browser console for errors
- Verify guacamole-common-js is loaded
- Check WebSocket connection in DevTools

## Next Steps

- Explore [Fastify Integration](../fastify/) for better performance
- See [Standalone Example](../standalone/) for minimal setup
- Check [Main Documentation](../../README.md) for advanced features
