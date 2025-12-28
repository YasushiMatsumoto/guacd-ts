# Types Module

Module providing TypeScript type definitions.

## File Structure

- **index.ts** - All type definitions and interfaces

## Main Types

### Server Configuration

- `WebSocketOptions` - WebSocket server settings
- `GuacdOptions` - guacd connection settings
- `ClientOptions` - Client settings
- `Callbacks` - Callback settings

### Connection Related

- `ConnectionSettings` - Connection settings
- `ProtocolType` - Protocol type (rdp, vnc, ssh, telnet)
- `ConnectionState` - Connection state

### Security

- `GuacamoleError` - Error class
- `GuacamoleErrorCode` - Error code enumeration

### Session Management

- `SessionRegistry` - Session registry interface
- `SessionData` - Session data
- `JoinedConnectionInfo` - Joined connection information

## Usage Example

```typescript
import { ClientOptions, GuacdOptions, LogLevel } from './types';

const options: ClientOptions = {
  log: {
    level: LogLevel.INFO,
  },
};
```
