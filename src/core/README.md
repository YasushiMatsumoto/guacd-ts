# Core Module

Core bridge logic for guacd-ts.

## Files
- `server.ts` – WebSocket server, session registry, routing to guacd.
- `client-connection.ts` – WebSocket ↔ guacd bridge per client.
- `guacd-client.ts` – TCP client to guacd, protocol handshake.

## Dependencies
- `../types` – shared types/enums.
- `../logging` – logger.
- `../protocols` – Guacamole protocol parser.

## Usage
```ts
import { GuacdServer } from './core/server';

const server = new GuacdServer(wsOptions, guacdOptions, clientOptions);
```
