# Express Integration Example

This example shows how to embed `guacd-ts` inside an Express.js app, issue session IDs from the server, and connect from the browser via `guacamole-common-js`.

## Features
- Express HTTP server with WebSocket support
- REST API to issue session IDs (`sessionId` + `wsUrl`)
- Type-safe connection builders (RDP/VNC/SSH)
- Interactive web UI (enter params, click Connect)
- Lightweight stats/health endpoints

## Prerequisites
1. `guacd` running (default `127.0.0.1:4822`)
   ```bash
   docker run -d -p 4822:4822 guacamole/guacd
   ```
2. Install deps (inside repo root)
   ```bash
   npm install express
   ```

## Quick Start
```bash
npx ts-node examples/express/server.ts
# open http://localhost:3000
```
Enter connection details in the form and click **Connect**. The server issues a session ID, stores connection settings server-side, and the browser connects with `ws://<host>/?sessionId=...`.

## Environment Variables
```bash
PORT=3000                 # optional
GUACD_HOST=127.0.0.1      # optional
GUACD_PORT=4822           # optional
SESSION_TTL_MS=600000     # optional (10 minutes default)
```

## API
### POST /api/session
Issue a session ID and WebSocket URL.

Request body (example):
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
Response:
```json
{
  "success": true,
  "sessionId": "ab12cd34-...",
  "wsUrl": "ws://localhost:3000/?sessionId=ab12cd34-..."
}
```

### GET /api/stats
Returns active connections count, uptime, memory usage.

### GET /api/health
Simple health check.

## Browser Usage (snippet)
```js
const res = await fetch('/api/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ protocol: 'rdp', hostname: '192.168.1.100', port: 3389 })
});
const { wsUrl } = await res.json();
const tunnel = new Guacamole.WebSocketTunnel(wsUrl);
const client = new Guacamole.Client(tunnel);
client.connect();
```

## Notes
- Credentials stay server-side; the client only receives a session ID.
- Session TTL defaults to 10 minutes; adjust with `SESSION_TTL_MS`.
- If you front with HTTPS, update the generated `ws://` to `wss://` as appropriate.
