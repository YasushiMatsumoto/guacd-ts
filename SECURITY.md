# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in guacd-ts, please email security@example.com with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if available)

We will respond within 48 hours and work with you to resolve the issue.

## Security Best Practices

### Encryption

- **Always use AES-256-CBC** for token encryption
- **Use strong keys** - Minimum 32 bytes, generated with cryptographically secure random
- **Rotate keys regularly** - Implement key rotation policy
- **Never hardcode keys** - Use environment variables or secure key management systems

### Connection Security

- **Use WSS (WebSocket Secure)** in production environments
- **Implement rate limiting** to prevent connection flooding
- **Validate cookies** before establishing connections
- **Set connection timeouts** to prevent resource exhaustion

### Token Management

- **Short-lived tokens** - Generate tokens with expiration times
- **One-time use** - Consider implementing token invalidation after use
- **Secure transmission** - Only send tokens over HTTPS/WSS
- **No logging** - Never log decrypted tokens or credentials

### Session Management

- **Implement session timeouts** - Use `maxInactivityTime` option
- **Monitor active sessions** - Track and limit concurrent connections per user
- **Clean up sessions** - Remove expired sessions from registry
- **Audit trail** - Log session creation and termination

### Network Security

- **Firewall rules** - Restrict access to guacd port (4822)
- **Network segmentation** - Isolate guacd and target systems
- **VPN/Private network** - Use for production deployments
- **TLS for guacd** - Consider using stunnel for encrypted guacd connections

## Dependencies

We regularly update dependencies to patch security vulnerabilities. Run:

```bash
npm audit
npm audit fix
```

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Features

- ✅ Encrypted connection tokens
- ✅ Cookie validation callbacks
- ✅ Connection lifecycle hooks
- ✅ Inactivity timeouts
- ✅ Error handling without exposing internals
- ✅ Session management with pluggable storage
- ✅ TypeScript type safety
