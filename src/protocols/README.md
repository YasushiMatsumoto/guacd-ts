# Protocols Module

Type-safe connection builders for all supported Guacamole protocols.

## Features

- **Comprehensive Type Definitions** - Complete parameter definitions for RDP, VNC, SSH, Telnet, Kubernetes
- **Fluent Builder API** - Easy-to-use, chainable methods for constructing connections
- **Validation** - Built-in parameter validation with helpful error messages
- **Smart Defaults** - Sensible default values for common scenarios
- **Protocol Detection** - Auto-detect protocol from port number or connection string

## Supported Protocols

- **RDP** (Remote Desktop Protocol) - Windows remote desktop connections
- **VNC** (Virtual Network Computing) - Cross-platform graphical desktop sharing
- **SSH** (Secure Shell) - Secure terminal access
- **Telnet** - Legacy terminal protocol
- **Kubernetes** - Direct pod/container access

## Quick Start

### RDP Connection

```typescript
import { createConnectionBuilder } from './protocols';

const rdpConnection = createConnectionBuilder('rdp')
  .hostname('192.168.1.100')
  .username('Administrator')
  .password('P@ssw0rd')
  .domain('MYDOMAIN')
  .security('nla')
  .colorDepth(24)
  .enableDrive('/home/user/shared', 'SharedFolder')
  .build();
```

### VNC Connection

```typescript
const vncConnection = createConnectionBuilder('vnc')
  .hostname('192.168.1.200')
  .password('vncpass')
  .colorDepth(24)
  .cursor('remote')
  .build();
```

### SSH Connection

```typescript
const sshConnection = createConnectionBuilder('ssh')
  .hostname('example.com')
  .port(22)
  .username('admin')
  .password('secret')
  .font('monospace', 14)
  .colorScheme('gray-black')
  .enableSFTP('/home/admin')
  .build();
```

### Telnet Connection

```typescript
const telnetConnection = createConnectionBuilder('telnet')
  .hostname('legacy-system.local')
  .port(23)
  .username('admin')
  .password('admin')
  .build();
```

## Advanced Usage

### Validation

```typescript
const builder = createConnectionBuilder('rdp').hostname('192.168.1.100').username('admin');

const validation = builder.validate();
if (!validation.valid) {
  console.error('Errors:', validation.errors);
  console.warn('Warnings:', validation.warnings);
}
```

### Custom Configuration

```typescript
const rdp = createConnectionBuilder('rdp')
  .hostname('server.example.com')
  .username('user')
  .password('pass')
  .performanceFlags({
    wallpaper: false,
    theming: false,
    fontSmoothing: true,
    fullWindowDrag: false,
  })
  .resize('display-update')
  .enableRecording('/var/recordings', 'session-2024')
  .build();
```

### Protocol Detection

```typescript
import { detectProtocolFromPort, parseConnectionString } from './protocols';

// Detect from port
const protocol = detectProtocolFromPort(3389); // 'rdp'

// Parse connection string
const { protocol, hostname, port } = parseConnectionString('rdp://server:3389');
```

## RDP Builder Methods

- `hostname(hostname: string)` - Server hostname or IP
- `port(port: number)` - Server port (default: 3389)
- `username(username: string)` - Username
- `password(password: string)` - Password
- `domain(domain: string)` - Windows domain
- `security(mode)` - Security mode: 'any', 'nla', 'tls', 'rdp', 'vmconnect'
- `ignoreCert(ignore?)` - Ignore certificate validation
- `colorDepth(depth)` - Color depth: 8, 16, 24, 32
- `enableDrive(path, name?)` - Enable drive redirection
- `enableAudio(enable?)` - Enable audio
- `enablePrinting(printerName?)` - Enable printing
- `remoteApp(program, args?, workDir?)` - RemoteApp configuration
- `gateway(hostname, username?, password?, port?)` - RD Gateway
- `readOnly(readOnly?)` - Read-only mode
- `disableClipboard(disable?)` - Disable clipboard
- `enableRecording(path, name?)` - Session recording
- `performanceFlags(flags)` - Performance optimization
- `resize(method)` - Resize method: 'display-update' or 'reconnect'

## VNC Builder Methods

- `hostname(hostname: string)` - Server hostname or IP
- `port(port: number)` - Server port (default: 5900)
- `password(password: string)` - VNC password
- `username(username: string)` - Username (if required)
- `cursor(mode)` - Cursor mode: 'local' or 'remote'
- `colorDepth(depth)` - Color depth: 8, 16, 24, 32
- `swapRedBlue(swap?)` - Swap red/blue components
- `readOnly(readOnly?)` - Read-only mode
- `disableClipboard(disable?)` - Disable clipboard
- `enableSFTP(hostname, username, password?, port?)` - SFTP file transfer
- `autoRetry(attempts)` - Auto-retry connection

## SSH Builder Methods

- `hostname(hostname: string)` - Server hostname or IP
- `port(port: number)` - SSH port (default: 22)
- `username(username: string)` - Username
- `password(password: string)` - Password
- `privateKey(key, passphrase?)` - Private key authentication
- `font(name, size?)` - Terminal font
- `colorScheme(scheme)` - Color scheme
- `command(cmd)` - Command to execute
- `enableSFTP(rootDir?)` - Enable SFTP
- `scrollback(lines)` - Scrollback buffer size
- `keepAlive(interval?)` - Keep-alive interval
- `readOnly(readOnly?)` - Read-only mode
- `disableClipboard(disable?)` - Disable clipboard
- `enableRecording(path, name?)` - Session recording

## Telnet Builder Methods

- `hostname(hostname: string)` - Server hostname or IP
- `port(port: number)` - Telnet port (default: 23)
- `username(username: string)` - Username
- `password(password: string)` - Password
- `font(name, size?)` - Terminal font
- `colorScheme(scheme)` - Color scheme
- `scrollback(lines)` - Scrollback buffer size
- `loginRegex(usernameRegex, passwordRegex)` - Automated login
- `readOnly(readOnly?)` - Read-only mode
- `disableClipboard(disable?)` - Disable clipboard

## Utility Functions

### Protocol Detection

```typescript
detectProtocolFromPort(port: number): ProtocolTypeLiteral | null
getDefaultPort(protocol: ProtocolTypeLiteral): number
```

### Protocol Capabilities

```typescript
supportsFileTransfer(protocol: ProtocolTypeLiteral): boolean
supportsAudio(protocol: ProtocolTypeLiteral): boolean
isTerminalProtocol(protocol: ProtocolTypeLiteral): boolean
isGraphicalProtocol(protocol: ProtocolTypeLiteral): boolean
```

### Display & Configuration

```typescript
getProtocolDisplayName(protocol: ProtocolTypeLiteral): string
getRecommendedColorDepth(protocol: ProtocolTypeLiteral): number | null
parseConnectionString(connectionString: string): ParsedConnection
```

## Type Definitions

All protocol parameters are fully typed with comprehensive interfaces:

- `RDPConnectionParams`
- `VNCConnectionParams`
- `SSHConnectionParams`
- `TelnetConnectionParams`
- `KubernetesConnectionParams`
- `ProtocolConnectionParams` (union type)

## Validation

All builders include validation:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

Validation checks:

- Required fields (hostname, etc.)
- Port number ranges
- Authentication combinations
- Security configuration

## Best Practices

1. **Always validate before building** - Use `validate()` to catch issues early
2. **Use type inference** - Let TypeScript guide you with autocomplete
3. **Leverage smart defaults** - Builders include sensible defaults for common scenarios
4. **Handle warnings** - Pay attention to validation warnings for security issues
5. **Use protocol detection** - Auto-detect protocol when possible for better UX

## Examples

See the [examples](../examples) directory for complete working examples.
