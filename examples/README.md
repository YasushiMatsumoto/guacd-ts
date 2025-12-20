# Guacd-TS Examples

Complete examples demonstrating various integration patterns with guacd-ts.

## 📁 Available Examples

### ✅ [Express Integration](./express/)

Production-ready Express.js integration with REST API and web interface.

**Features:**

- HTTP + WebSocket on same port
- REST API for token generation
- Interactive web UI
- Real-time statistics
- TypeScript with Protocol Builders

**Quick Start:**

```bash
cd examples/express
npx ts-node server.ts
# Open http://localhost:3000
```

## 🚧 Upcoming Examples

The following examples are planned and will be added soon:

### Fastify Integration

High-performance Fastify integration with async/await support.

**Coming Soon:**

- Native async/await patterns
- Better performance than Express
- Built-in schema validation
- TypeScript-first approach

### Standalone Server

Minimal WebSocket-only server without HTTP framework.

**Coming Soon:**

- Pure WebSocket server
- Minimal dependencies
- Perfect for learning
- Command-line token generation

### Redis Session Management

Enterprise session management with Redis backend.

**Coming Soon:**

- Distributed session storage
- Session sharing across servers
- Automatic cleanup
- Connection pooling

### Authentication & Authorization

Complete authentication flow with JWT and role-based access.

**Coming Soon:**

- JWT-based authentication
- Role-based access control
- Cookie validation
- Session management

### Load Balancing

Multi-guacd instance load balancing example.

**Coming Soon:**

- Round-robin load balancing
- Health checks
- Failover support
- Connection affinity

### Docker Compose

Complete deployment setup with Docker Compose.

**Coming Soon:**

- Multi-container setup
- guacd + web server + Redis
- Environment configuration
- Production-ready

### Kubernetes Deployment

Kubernetes manifests for scalable deployment.

**Coming Soon:**

- Deployment configurations
- Service definitions
- ConfigMaps and Secrets
- Horizontal Pod Autoscaling

## Prerequisites

All examples require:

1. **guacd daemon**

   ```bash
   # Docker (recommended)
   docker run -d -p 4822:4822 guacamole/guacd

   # Ubuntu/Debian
   sudo apt-get install guacd

   # macOS
   brew install guacamole-server
   ```

2. **Node.js 16+**

   ```bash
   node --version  # Should be 16.0.0 or higher
   ```

3. **TypeScript** (for ts-node)
   ```bash
   npm install -g typescript ts-node
   ```

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/guacd-ts.git
   cd guacd-ts
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Choose an example**

   ```bash
   cd examples/express  # or another example
   ```

4. **Follow the example's README**
   Each example has its own README with specific instructions.

## Common Configuration

### Environment Variables

```bash
# Encryption key (32 bytes for AES-256-CBC)
export ENCRYPTION_KEY="MySuperSecretKeyForParamsToken12"

# Server port
export PORT=3000

# guacd connection
export GUACD_HOST=127.0.0.1
export GUACD_PORT=4822

# Log level
export LOG_LEVEL=INFO
```

### Protocol Support

All examples support these protocols:

- **RDP** - Remote Desktop Protocol (Windows)
- **VNC** - Virtual Network Computing
- **SSH** - Secure Shell
- **Telnet** - Terminal protocol

## Security Notes

⚠️ **Examples are for development/testing**

For production deployments:

- Use HTTPS/WSS (not HTTP/WS)
- Implement authentication
- Use environment variables for secrets
- Add rate limiting
- Enable audit logging
- Follow security best practices in [SECURITY.md](../SECURITY.md)

## Troubleshooting

### guacd Connection Issues

```bash
# Check if guacd is running
docker ps | grep guacd
# or
sudo systemctl status guacd

# Check if port is accessible
telnet localhost 4822
```

### Token Issues

```bash
# Verify encryption key length (should be 32 bytes)
echo -n "MySuperSecretKeyForParamsToken12" | wc -c

# Check token generation
curl -X POST http://localhost:3000/api/token \
  -H "Content-Type: application/json" \
  -d '{"protocol":"rdp","hostname":"192.168.1.100"}'
```

### WebSocket Issues

- Check browser console for errors
- Verify WebSocket URL format: `ws://host:port/?token=...`
- Ensure no proxy/firewall blocking WebSocket
- Check CORS settings if accessing from different origin

## Contributing

Want to contribute an example?

1. Create a new directory under `examples/`
2. Follow the structure of existing examples
3. Include a comprehensive README
4. Add entry to this file
5. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Support

- 📖 [Main Documentation](../README.md)
- 🐛 [Issue Tracker](https://github.com/yourusername/guacd-ts/issues)
- 💬 [Discussions](https://github.com/yourusername/guacd-ts/discussions)

## License

Apache License 2.0 - See [LICENSE](../LICENSE)
