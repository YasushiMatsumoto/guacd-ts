# guacd-ts Examples — Parameter Explorer

A developer tool for testing all guacd-ts connection parameters visually.

**Left panel**: all parameters for each protocol in a collapsible form  
**Right panel**: live Guacamole remote desktop

Change parameters and reconnect to verify the effect of each option.

---

## Quick Start

### 1. Start protocol containers

```bash
cd examples
docker compose up -d
```

Default credentials:

| Protocol | Host:Port         | User        | Password    |
|----------|-------------------|-------------|-------------|
| RDP      | localhost:13389   | rdpuser     | rdppass     |
| VNC      | localhost:15900   | —           | vncpass     |
| SSH      | localhost:2222    | sshuser     | sshpass     |
| Telnet   | localhost:12323   | telnetuser  | telnetpass  |

### 2. Start the backend server

```bash
cd examples/server
npm install
cp .env.example .env   # edit if needed
npm run dev
# → http://localhost:3000
```

### 3. Start the frontend (separate terminal)

```bash
cd examples/client
npm install
npm run dev
# → http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in a browser.

---

## Architecture

```
Browser (Vite SPA)          Express Server          guacd
  http://localhost:5173  →  http://localhost:3000  →  :4822
                                      ↓
                              Docker containers
                              RDP     :13389
                              Console :2222 (SSH) / :12323 (Telnet)
                              VNC     :15900
```

- **POST /api/validate** — real-time form validation (debounced 500 ms)
- **POST /api/ticket** — issues a one-time connection ticket
- **POST /api/join** — joins an existing session (read-only)
- **GET /api/connections** — lists active sessions
- **WS /ws?ticket=…** — WebSocket upgraded by guacd-ts
- Vite proxies `/api` to `localhost:3000`; the WebSocket connects directly

---

## API

```
POST /api/ticket       { protocol, settings, allowJoin }  → { ticketId, wsUrl, expiresAt, warnings }
POST /api/validate     { protocol, settings }             → { valid, errors, warnings }
POST /api/join         { connectionId }                   → { ticketId, wsUrl, expiresAt }
GET  /api/connections                                     → { connections[] }
GET  /api/health                                          → { status, timestamp, guacd }
GET  /api/stats                                           → { activeConnections, uptime, memory }
```

`settings` is a flat key/value object using guacamole parameter names directly
(e.g. `{ "hostname": "10.0.0.1", "color-depth": 24, "ignore-cert": true }`).

---

## Environment Variables (`server/.env`)

```
PORT=3000
GUACD_HOST=127.0.0.1
GUACD_PORT=4822
TICKET_TTL_MS=300000
LOG_LEVEL=DEBUG
```

---

## Notes

- These examples are excluded from the npm package (`.npmignore`).
- `guacamole-common-js` is only used client-side; the server has no dependency on it.
- Docker volumes persist SSH host keys between restarts (`console-hostkeys`).
