# Core Module

This module contains the core functionality of guacd-ts.

## File Structure

- **server.ts** - Main server class. Manages WebSocket connections and routing to guacd
- **client-connection.ts** - Manages individual client connections. Bridge between WebSocket ↔ guacd
- **guacd-client.ts** - Manages TCP connection to guacd daemon

## Dependencies

- `../types` - Type definitions
- `../logging` - Logging functionality
- `../crypto` - Encryption functionality
- `../protocol` - Guacamole protocol parser

## Usage Example

```typescript
import { GuacdServer } from './core/server';

const server = new GuacdServer(wsOptions, guacdOptions, clientOptions);
```
