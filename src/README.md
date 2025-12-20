# Source Directory Structure

Production-level organized directory structure.

## Directory Layout

```
src/
├── core/                  # Core logic
│   ├── server.ts         # Main server class
│   ├── client-connection.ts  # Client connection management
│   ├── guacd-client.ts   # guacd TCP connection
│   └── README.md
│
├── protocol/              # Guacamole protocol
│   ├── parser.ts         # Protocol parser
│   └── README.md
│
├── crypto/                # Encryption & security
│   ├── crypt.ts          # Token encryption
│   └── README.md
│
├── logging/               # Logging
│   ├── logger.ts         # Logger implementation
│   └── README.md
│
├── types/                 # Type definitions
│   ├── index.ts          # TypeScript type definitions
│   └── README.md
│
├── __tests__/             # Tests
│   ├── core/             # Core module tests
│   ├── protocol/         # Protocol module tests
│   ├── crypto/           # Crypto module tests
│   └── logging/          # Logging module tests
│
└── index.ts               # Public API exports
```

## Module Overview

### Core (`core/`)

Provides core functionality including WebSocket connections, guacd communication, and session management.

### Protocol (`protocol/`)

Handles Guacamole protocol parsing and generation.

### Crypto (`crypto/`)

Provides encryption and decryption for connection tokens. AES-256-CBC is recommended.

### Logging (`logging/`)

Provides level-based logging functionality (ERROR, WARN, INFO, DEBUG, VERBOSE).

### Types (`types/`)

Consolidates all TypeScript type definitions and interfaces.

## Design Principles

1. **Separation of Concerns** - Each module has a clear responsibility
2. **Dependency Management** - Avoid circular dependencies, maintain unidirectional dependency flow
3. **Testability** - Each module has corresponding test directory
4. **Extensibility** - Easy to add new features
5. **Maintainability** - Easy to understand and modify code

## Dependency Graph

```
core/          → types/, logging/, crypto/, protocol/
protocol/      → types/
crypto/        → types/
logging/       → types/
types/         → (no dependencies)
```

## Adding New Features

When adding new features:

1. Select appropriate module directory (or create new one)
2. Add type definitions to `types/`
3. Create implementation files
4. Add corresponding tests to `__tests__/`
5. Update module's README.md
6. Export from `index.ts` (if needed)
