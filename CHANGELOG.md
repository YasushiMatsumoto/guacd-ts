# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

- WebRTC support
- Clipboard synchronization
- File transfer support
- Recording capabilities
- Load balancing across multiple guacd instances
- Prometheus metrics
- Health check endpoints
- Admin dashboard
