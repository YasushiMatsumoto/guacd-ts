# Crypto Module

Module responsible for encryption and decryption of connection tokens.

## File Structure

- **crypt.ts** - AES encryption utility

## Security

This module securely encrypts connection tokens containing sensitive information (credentials, etc.).

### Supported Encryption Methods

- AES-128-CBC (16-byte key)
- AES-192-CBC (24-byte key)
- AES-256-CBC (32-byte key) **Recommended**

## Usage Example

```typescript
import { Crypt } from './crypto/crypt';

const crypt = new Crypt('AES-256-CBC', 'your-32-byte-secret-key-here!!');

// Encrypt
const encrypted = crypt.encrypt({
  connection: {
    type: 'rdp',
    settings: { hostname: '192.168.1.100', username: 'admin' },
  },
});

// Decrypt
const decrypted = crypt.decrypt(encrypted);
```

## Best Practices

- Always use AES-256-CBC (32-byte key)
- Store keys in environment variables, never hardcode
- Rotate keys regularly
- Only transmit encrypted tokens over HTTPS/WSS
