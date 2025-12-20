import * as crypto from 'crypto';
import { CryptConfig, EncryptedToken } from '../types';

/**
 * Encryption/Decryption utility for connection tokens
 */
export class Crypt {
  constructor(
    private readonly cypher: string,
    private readonly key: string
  ) {
    // Validate key length based on cipher
    this.validateKeyLength();
  }

  /**
   * Validate encryption key length
   */
  private validateKeyLength(): void {
    const keyBuffer = Buffer.from(this.key);
    const requiredLength = this.getRequiredKeyLength();

    if (keyBuffer.length !== requiredLength) {
      throw new Error(
        `Invalid key length for ${this.cypher}. Expected ${requiredLength} bytes, got ${keyBuffer.length} bytes`
      );
    }
  }

  /**
   * Get required key length for cipher
   */
  private getRequiredKeyLength(): number {
    const cipherLower = this.cypher.toLowerCase();
    if (cipherLower.includes('256')) {
      return 32; // 256 bits = 32 bytes
    } else if (cipherLower.includes('192')) {
      return 24; // 192 bits = 24 bytes
    } else if (cipherLower.includes('128')) {
      return 16; // 128 bits = 16 bytes
    }
    return 32; // Default to 256-bit
  }

  /**
   * Encrypt a token object
   */
  encrypt(value: EncryptedToken): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.cypher, Buffer.from(this.key), iv);

    let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const data = {
      iv: iv.toString('base64'),
      value: encrypted,
    };

    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Decrypt a token string
   */
  decrypt(encryptedToken: string): EncryptedToken {
    try {
      const jsonString = Buffer.from(encryptedToken, 'base64').toString('utf8');
      const data = JSON.parse(jsonString) as { iv: string; value: string };

      const decipher = crypto.createDecipheriv(
        this.cypher,
        Buffer.from(this.key),
        Buffer.from(data.iv, 'base64')
      );

      let decrypted = decipher.update(data.value, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted) as EncryptedToken;
    } catch (error) {
      throw new Error(
        `Failed to decrypt token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Create Crypt instance from config
 */
export function createCrypt(config: CryptConfig): Crypt {
  return new Crypt(config.cypher, config.key);
}
