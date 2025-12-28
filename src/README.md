# Source Directory Structure

## Directory Layout

```
src/
├── core/          # Core server/client bridge logic
├── protocols/     # Guacamole parser + protocol builders/utils
├── logging/       # Logger implementation
├── types/         # Shared type definitions
├── __tests__/     # Unit tests
└── index.ts       # Public API exports
```

## Module Overview

- **core/**: WebSocket handling, guacd TCP client, session management.
- **protocols/**: Guacamole protocol parser and type-safe builders/utilities per protocol.
- **logging/**: Level-based logger.
- **types/**: Shared interfaces/enums across the project.

## Dependency Graph

```
core/       -> types/, logging/, protocols/
protocols/  -> types/
logging/    -> types/
types/      -> (no dependencies)
```

## Adding New Features

1. Place code in the appropriate module (or add a new subfolder).
2. Add/update types in `types/`.
3. Add tests under `__tests__/` mirroring the module path.
4. Export from `index.ts` if needed.
5. Update module docs when relevant.
