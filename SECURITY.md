# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in guacd-ts, please email security@example.com with:

1) Description of the vulnerability  
2) Steps to reproduce  
3) Potential impact  
4) Suggested fix (if available)

We will respond within 48 hours and work with you to resolve the issue.

## Security Best Practices

### Connection Security
- Use WSS (WebSocket Secure) in production environments
- Implement rate limiting to prevent connection flooding
- Validate cookies before establishing connections
- Set connection timeouts to prevent resource exhaustion

### Session Management
- Implement session timeouts (`maxInactivityTime`)
- Monitor active sessions and limit concurrent connections per user
- Clean up expired sessions from registry
- Keep audit trails for session creation/termination

### Network Security
- Restrict access to guacd port (4822) via firewall
- Isolate guacd and target systems (network segmentation)
- Prefer VPN/private networks for production deployments
- Consider stunnel/TLS termination for guacd traffic

## Dependencies

We regularly update dependencies to patch security vulnerabilities. Run:

```bash
npm audit
npm audit fix
```

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ |
| < 1.0   | ❌ |

## Security Features
- Cookie validation callbacks
- Connection lifecycle hooks
- Inactivity timeouts
- Error handling without exposing internals
- Session management with pluggable storage
- TypeScript type safety
