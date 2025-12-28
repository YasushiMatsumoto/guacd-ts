# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-29

### Changed
- Consolidated `protocol/` into `protocols/` (parser + builders + utils in one place).
- Guacamole parser now counts UTF-8 byte lengths (multibyte-safe instructions).
- RDP/SSH builder validation tightened (username required for RDP, auth required for SSH); tests updated.
- Logging: handshake I/O stays at DEBUG, post-handshake I/O is VERBOSE to reduce noise.
- Removed Crypt/token legacy surface from types and README; docs refreshed (README/SECURITY).
- Core/Protocols README regenerated to match new layout; security policy trimmed to current features.

### Fixed
- Adjusted tests and docs after validation and logging changes; full jest suite passing.

## [1.0.0] - 2025-12-20

### Added

- Initial release of guacd-ts
- TypeScript-first implementation with full type safety
- GuacdServer class for managing WebSocket<->guacd connections
- ClientConnection class for individual connection management
- GuacdClient class for TCP communication with guacd
- Encryption utilities (Crypt) for secure token handling
- Logger with configurable log levels
- Guacamole protocol parser
- Session management with pluggable storage (Map, Redis)
- Cookie validation callback support
- Connection lifecycle events (open, close, error)
- Dynamic guacd routing support
- Session joining support for collaboration
- Express integration support
- Fastify integration support
- Comprehensive test suite with Jest
- Examples for standalone, Express, Fastify, and Redis integration
- Full documentation and API reference
- Security best practices guide
- Contributing guidelines

### Security

- AES-256-CBC token encryption
- Cookie validation hooks
- Connection timeout handling
- Secure error handling without exposing internals
- Rate limiting recommendations

## [Unreleased]

### Planned

- Kubernetes protocol builder
- TLS/stunnel support and multi-guacd load balancing/failover
- Prometheus metrics and health check endpoints
- File transfer and clipboard enhancements (RDP/VNC/SSH)
- Reconnect/resume support and session recording
- Admin/monitoring dashboard
