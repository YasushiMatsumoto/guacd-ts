import {
  detectProtocolFromPort,
  getDefaultPort,
  supportsFileTransfer,
  supportsAudio,
  isTerminalProtocol,
  isGraphicalProtocol,
  getProtocolDisplayName,
  getRecommendedColorDepth,
  parseConnectionString,
} from '../../protocols/utils';
import type { ProtocolType } from '../../types';

describe('Protocol Detection', () => {
  describe('detectProtocolFromPort', () => {
    it('should detect RDP from port 3389', () => {
      expect(detectProtocolFromPort(3389)).toBe('rdp');
    });

    it('should detect VNC from port 5900', () => {
      expect(detectProtocolFromPort(5900)).toBe('vnc');
    });

    it('should detect SSH from port 22', () => {
      expect(detectProtocolFromPort(22)).toBe('ssh');
    });

    it('should detect Telnet from port 23', () => {
      expect(detectProtocolFromPort(23)).toBe('telnet');
    });

    it('should return null for unknown port', () => {
      expect(detectProtocolFromPort(12345)).toBeNull();
    });

    it('should detect VNC from alternate ports (5901-5903)', () => {
      expect(detectProtocolFromPort(5901)).toBe('vnc');
      expect(detectProtocolFromPort(5902)).toBe('vnc');
      expect(detectProtocolFromPort(5903)).toBe('vnc');
    });

    it('should return null for out-of-range VNC ports', () => {
      expect(detectProtocolFromPort(5899)).toBeNull();
      expect(detectProtocolFromPort(5911)).toBeNull();
    });
  });

  describe('getDefaultPort', () => {
    it('should return correct default ports', () => {
      expect(getDefaultPort('rdp')).toBe(3389);
      expect(getDefaultPort('vnc')).toBe(5900);
      expect(getDefaultPort('ssh')).toBe(22);
      expect(getDefaultPort('telnet')).toBe(23);
    });
  });
});

describe('Protocol Capabilities', () => {
  describe('supportsFileTransfer', () => {
    it('should return true for protocols with file transfer', () => {
      expect(supportsFileTransfer('rdp')).toBe(true);
      expect(supportsFileTransfer('vnc')).toBe(true);
      expect(supportsFileTransfer('ssh')).toBe(true);
    });

    it('should return false for protocols without file transfer', () => {
      expect(supportsFileTransfer('telnet')).toBe(false);
    });
  });

  describe('supportsAudio', () => {
    it('should return true for protocols with audio', () => {
      expect(supportsAudio('rdp')).toBe(true);
      expect(supportsAudio('vnc')).toBe(true);
    });

    it('should return false for protocols without audio', () => {
      expect(supportsAudio('ssh')).toBe(false);
      expect(supportsAudio('telnet')).toBe(false);
    });
  });

  describe('isTerminalProtocol', () => {
    it('should return true for terminal-based protocols', () => {
      expect(isTerminalProtocol('ssh')).toBe(true);
      expect(isTerminalProtocol('telnet')).toBe(true);
    });

    it('should return false for graphical protocols', () => {
      expect(isTerminalProtocol('rdp')).toBe(false);
      expect(isTerminalProtocol('vnc')).toBe(false);
    });
  });

  describe('isGraphicalProtocol', () => {
    it('should return true for graphical protocols', () => {
      expect(isGraphicalProtocol('rdp')).toBe(true);
      expect(isGraphicalProtocol('vnc')).toBe(true);
    });

    it('should return false for terminal protocols', () => {
      expect(isGraphicalProtocol('ssh')).toBe(false);
      expect(isGraphicalProtocol('telnet')).toBe(false);
    });
  });
});

describe('Protocol Information', () => {
  describe('getProtocolDisplayName', () => {
    it('should return correct display names', () => {
      expect(getProtocolDisplayName('rdp')).toBe('Remote Desktop (RDP)');
      expect(getProtocolDisplayName('vnc')).toBe('VNC');
      expect(getProtocolDisplayName('ssh')).toBe('SSH');
      expect(getProtocolDisplayName('telnet')).toBe('Telnet');
    });
  });

  describe('getRecommendedColorDepth', () => {
    it('should recommend appropriate color depths', () => {
      expect(getRecommendedColorDepth('rdp')).toBe(24);
      expect(getRecommendedColorDepth('vnc')).toBe(24);
      expect(getRecommendedColorDepth('ssh')).toBeNull();
      expect(getRecommendedColorDepth('telnet')).toBeNull();
    });
  });
});

describe('Connection String Parsing', () => {
  describe('parseConnectionString', () => {
    it('should parse full connection string', () => {
      const result = parseConnectionString('rdp://admin:password@server.local:3390');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.protocol).toBe('rdp');
        expect(result.hostname).toBe('server.local');
        expect(result.port).toBe(3390);
        expect(result.username).toBe('admin');
        expect(result.password).toBe('password');
      }
    });

    it('should parse connection string without credentials', () => {
      const result = parseConnectionString('vnc://192.168.1.100:5901');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.protocol).toBe('vnc');
        expect(result.hostname).toBe('192.168.1.100');
        expect(result.port).toBe(5901);
        expect(result.username).toBeUndefined();
        expect(result.password).toBeUndefined();
      }
    });

    it('should parse connection string without port', () => {
      const result = parseConnectionString('ssh://user@server.local');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.protocol).toBe('ssh');
        expect(result.hostname).toBe('server.local');
        expect(result.port).toBeUndefined();
        expect(result.username).toBe('user');
        expect(result.password).toBeUndefined();
      }
    });

    it('should parse connection string with only hostname', () => {
      const result = parseConnectionString('telnet://legacy-system');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.protocol).toBe('telnet');
        expect(result.hostname).toBe('legacy-system');
        expect(result.port).toBeUndefined();
        expect(result.username).toBeUndefined();
        expect(result.password).toBeUndefined();
      }
    });

    it('should handle IPv6 addresses', () => {
      const result = parseConnectionString('rdp://[2001:db8::1]:3389');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.protocol).toBe('rdp');
        expect(result.hostname).toBe('2001:db8::1');
        expect(result.port).toBe(3389);
      }
    });

    it('should handle username with special characters', () => {
      const result = parseConnectionString('ssh://user%40domain:pass@server');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.protocol).toBe('ssh');
        expect(result.hostname).toBe('server');
        expect(result.username).toBe('user@domain');
        expect(result.password).toBe('pass');
      }
    });

    it('should handle password with special characters', () => {
      const result = parseConnectionString('rdp://admin:P%40ssw0rd%21@server');

      expect(result).not.toBeNull();
      if (result) {
        expect(result.protocol).toBe('rdp');
        expect(result.hostname).toBe('server');
        expect(result.username).toBe('admin');
        expect(result.password).toBe('P@ssw0rd!');
      }
    });

    it('should return null for invalid URL', () => {
      expect(parseConnectionString('not-a-valid-url')).toBeNull();
      expect(parseConnectionString('http://example.com')).toBeNull();
      expect(parseConnectionString('')).toBeNull();
    });

    it('should handle edge cases', () => {
      // No hostname (empty hostname should still parse but we can verify other values)
      const emptyHostResult = parseConnectionString('rdp://');
      expect(emptyHostResult).not.toBeNull();
      if (emptyHostResult) {
        expect(emptyHostResult.protocol).toBe('rdp');
        expect(emptyHostResult.hostname).toBe('');
      }

      // Valid protocols only
      expect(parseConnectionString('ftp://server.local')).toBeNull();
    });
  });
});

describe('Integration Tests', () => {
  it('should detect protocol and get default port', () => {
    const protocol = detectProtocolFromPort(3389);
    expect(protocol).toBe('rdp');

    if (protocol) {
      const port = getDefaultPort(protocol);
      expect(port).toBe(3389);
    }
  });

  it('should parse connection string and validate capabilities', () => {
    const parsed = parseConnectionString('rdp://server.local:3389');

    expect(parsed).not.toBeNull();
    if (parsed && parsed.protocol) {
      expect(supportsFileTransfer(parsed.protocol)).toBe(true);
      expect(supportsAudio(parsed.protocol)).toBe(true);
      expect(isGraphicalProtocol(parsed.protocol)).toBe(true);
      expect(isTerminalProtocol(parsed.protocol)).toBe(false);
    }
  });

  it('should work with all supported protocols', () => {
    const protocols: ProtocolType[] = ['rdp', 'vnc', 'ssh', 'telnet'];

    protocols.forEach((protocol) => {
      const port = getDefaultPort(protocol);
      expect(port).toBeGreaterThan(0);

      const displayName = getProtocolDisplayName(protocol);
      expect(displayName).toBeTruthy();

      const detectedProtocol = detectProtocolFromPort(port);
      expect(detectedProtocol).toBe(protocol);
    });
  });
});
