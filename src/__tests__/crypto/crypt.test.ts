import { Crypt } from '../../crypto/crypt';

describe('Crypt', () => {
  const cypher = 'AES-256-CBC';
  const key = 'MySuperSecretKeyForParamsToken12'; // 32 bytes
  let crypt: Crypt;

  beforeEach(() => {
    crypt = new Crypt(cypher, key);
  });

  describe('constructor', () => {
    it('should create instance with valid key length', () => {
      expect(crypt).toBeInstanceOf(Crypt);
    });

    it('should throw error with invalid key length', () => {
      expect(() => new Crypt(cypher, 'short')).toThrow('Invalid key length');
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt token correctly', () => {
      const token = {
        connection: {
          type: 'rdp' as const,
          settings: {
            hostname: '192.168.1.100',
            username: 'admin',
            password: 'secret',
          },
        },
      };

      const encrypted = crypt.encrypt(token);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);

      const decrypted = crypt.decrypt(encrypted);
      expect(decrypted).toEqual(token);
    });

    it('should throw error when decrypting invalid token', () => {
      expect(() => crypt.decrypt('invalid-token')).toThrow('Failed to decrypt token');
    });

    it('should handle complex token structures', () => {
      const token = {
        connection: {
          type: 'vnc' as const,
          settings: {
            hostname: '10.0.0.1',
            port: 5900,
            'enable-audio': true,
            audio: ['audio/L16', 'audio/L8'],
          },
        },
        userId: 123,
        timestamp: Date.now(),
      };

      const encrypted = crypt.encrypt(token);
      const decrypted = crypt.decrypt(encrypted);
      expect(decrypted).toEqual(token);
    });
  });
});
