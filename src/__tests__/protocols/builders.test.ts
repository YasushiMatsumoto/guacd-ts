import {
  RDPConnectionBuilder,
  VNCConnectionBuilder,
  SSHConnectionBuilder,
  TelnetConnectionBuilder,
  createConnectionBuilder,
} from '../../protocols/builders';

describe('RDPConnectionBuilder', () => {
  describe('basic connection', () => {
    it('should build valid RDP connection with minimal params', () => {
      const connection = new RDPConnectionBuilder().hostname('192.168.1.100').build();

      expect(connection.type).toBe('rdp');
      expect(connection.settings.hostname).toBe('192.168.1.100');
      expect(connection.settings.port).toBe(3389);
      expect(connection.settings.security).toBe('any');
      expect(connection.settings['ignore-cert']).toBe(true);
    });

    it('should build connection with credentials', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server.local')
        .username('admin')
        .password('P@ssw0rd')
        .domain('MYDOMAIN')
        .build();

      expect(connection.settings.username).toBe('admin');
      expect(connection.settings.password).toBe('P@ssw0rd');
      expect(connection.settings.domain).toBe('MYDOMAIN');
    });

    it('should throw error without hostname', () => {
      const builder = new RDPConnectionBuilder().username('admin');

      expect(() => builder.build()).toThrow('Invalid RDP connection');
    });
  });

  describe('advanced features', () => {
    it('should configure drive redirection', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .enableDrive('/home/user/shared', 'MyDrive')
        .build();

      expect(connection.settings['enable-drive']).toBe(true);
      expect(connection.settings['drive-path']).toBe('/home/user/shared');
      expect(connection.settings['drive-name']).toBe('MyDrive');
      expect(connection.settings['create-drive-path']).toBe(true);
    });

    it('should configure RemoteApp', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .remoteApp('calc.exe', '/option', 'C:\\')
        .build();

      expect(connection.settings['remote-app']).toBe('calc.exe');
      expect(connection.settings['remote-app-args']).toBe('/option');
      expect(connection.settings['remote-app-dir']).toBe('C:\\');
    });

    it('should configure gateway', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('internal-server')
        .gateway('gateway.example.com', 'gwuser', 'gwpass', 443)
        .build();

      expect(connection.settings['gateway-hostname']).toBe('gateway.example.com');
      expect(connection.settings['gateway-port']).toBe(443);
      expect(connection.settings['gateway-username']).toBe('gwuser');
      expect(connection.settings['gateway-password']).toBe('gwpass');
    });

    it('should configure performance flags', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .performanceFlags({
          wallpaper: true,
          theming: true,
          fontSmoothing: true,
          fullWindowDrag: false,
        })
        .build();

      expect(connection.settings['enable-wallpaper']).toBe(true);
      expect(connection.settings['enable-theming']).toBe(true);
      expect(connection.settings['enable-font-smoothing']).toBe(true);
      expect(connection.settings['enable-full-window-drag']).toBe(false);
    });

    it('should configure recording', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .enableRecording('/var/recordings', 'session-1')
        .build();

      expect(connection.settings['recording-path']).toBe('/var/recordings');
      expect(connection.settings['recording-name']).toBe('session-1');
      expect(connection.settings['create-recording-path']).toBe(true);
    });
  });

  describe('validation', () => {
    it('should validate successfully with required fields', () => {
      const builder = new RDPConnectionBuilder().hostname('server');
      const result = builder.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation without hostname', () => {
      const builder = new RDPConnectionBuilder();
      const result = builder.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('hostname is required');
    });

    it('should fail validation with invalid port', () => {
      const builder = new RDPConnectionBuilder().hostname('server').port(99999);
      const result = builder.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('port must be between 1 and 65535');
    });

    it('should warn about password without username', () => {
      const builder = new RDPConnectionBuilder().hostname('server').password('pass');
      const result = builder.validate();

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Password provided without username');
    });
  });
});

describe('VNCConnectionBuilder', () => {
  it('should build valid VNC connection', () => {
    const connection = new VNCConnectionBuilder()
      .hostname('vnc-server')
      .password('vncpass')
      .build();

    expect(connection.type).toBe('vnc');
    expect(connection.settings.hostname).toBe('vnc-server');
    expect(connection.settings.password).toBe('vncpass');
    expect(connection.settings.port).toBe(5900);
  });

  it('should configure SFTP', () => {
    const connection = new VNCConnectionBuilder()
      .hostname('vnc-server')
      .enableSFTP('sftp.example.com', 'sftpuser', 'sftppass', 22)
      .build();

    expect(connection.settings['enable-sftp']).toBe(true);
    expect(connection.settings['sftp-hostname']).toBe('sftp.example.com');
    expect(connection.settings['sftp-username']).toBe('sftpuser');
    expect(connection.settings['sftp-password']).toBe('sftppass');
    expect(connection.settings['sftp-port']).toBe(22);
  });

  it('should configure cursor mode', () => {
    const connection = new VNCConnectionBuilder().hostname('server').cursor('local').build();

    expect(connection.settings.cursor).toBe('local');
  });

  it('should configure auto-retry', () => {
    const connection = new VNCConnectionBuilder().hostname('server').autoRetry(5).build();

    expect(connection.settings.autoretry).toBe(5);
  });
});

describe('SSHConnectionBuilder', () => {
  it('should build valid SSH connection', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('ssh-server')
      .username('root')
      .password('secret')
      .build();

    expect(connection.type).toBe('ssh');
    expect(connection.settings.hostname).toBe('ssh-server');
    expect(connection.settings.username).toBe('root');
    expect(connection.settings.password).toBe('secret');
    expect(connection.settings.port).toBe(22);
  });

  it('should configure private key authentication', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('admin')
      .privateKey('-----BEGIN RSA PRIVATE KEY-----', 'passphrase')
      .build();

    expect(connection.settings['private-key']).toBe('-----BEGIN RSA PRIVATE KEY-----');
    expect(connection.settings.passphrase).toBe('passphrase');
  });

  it('should configure terminal settings', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .font('Courier New', 14)
      .colorScheme('solarized')
      .scrollback(2000)
      .build();

    expect(connection.settings['font-name']).toBe('Courier New');
    expect(connection.settings['font-size']).toBe(14);
    expect(connection.settings['color-scheme']).toBe('solarized');
    expect(connection.settings.scrollback).toBe(2000);
  });

  it('should enable SFTP', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .enableSFTP('/home/user')
      .build();

    expect(connection.settings['enable-sftp']).toBe(true);
    expect(connection.settings['sftp-root-directory']).toBe('/home/user');
  });

  it('should configure keep-alive', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .keepAlive(60)
      .build();

    expect(connection.settings['server-alive-interval']).toBe(60);
  });

  it('should configure command execution', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .command('ls -la')
      .build();

    expect(connection.settings.command).toBe('ls -la');
  });
});

describe('TelnetConnectionBuilder', () => {
  it('should build valid Telnet connection', () => {
    const connection = new TelnetConnectionBuilder().hostname('legacy-system').build();

    expect(connection.type).toBe('telnet');
    expect(connection.settings.hostname).toBe('legacy-system');
    expect(connection.settings.port).toBe(23);
  });

  it('should configure login credentials', () => {
    const connection = new TelnetConnectionBuilder()
      .hostname('server')
      .username('admin')
      .password('admin')
      .build();

    expect(connection.settings.username).toBe('admin');
    expect(connection.settings.password).toBe('admin');
  });

  it('should configure login regex', () => {
    const connection = new TelnetConnectionBuilder()
      .hostname('server')
      .loginRegex('login:', 'password:')
      .build();

    expect(connection.settings['username-regex']).toBe('login:');
    expect(connection.settings['password-regex']).toBe('password:');
  });
});

describe('createConnectionBuilder factory', () => {
  it('should create RDP builder', () => {
    const builder = createConnectionBuilder('rdp');
    expect(builder).toBeInstanceOf(RDPConnectionBuilder);
  });

  it('should create VNC builder', () => {
    const builder = createConnectionBuilder('vnc');
    expect(builder).toBeInstanceOf(VNCConnectionBuilder);
  });

  it('should create SSH builder', () => {
    const builder = createConnectionBuilder('ssh');
    expect(builder).toBeInstanceOf(SSHConnectionBuilder);
  });

  it('should create Telnet builder', () => {
    const builder = createConnectionBuilder('telnet');
    expect(builder).toBeInstanceOf(TelnetConnectionBuilder);
  });
});

describe('Fluent API chaining', () => {
  it('should allow method chaining', () => {
    const connection = new RDPConnectionBuilder()
      .hostname('server')
      .port(3390)
      .username('user')
      .password('pass')
      .domain('DOMAIN')
      .security('nla')
      .colorDepth(24)
      .readOnly(true)
      .build();

    expect(connection.settings.hostname).toBe('server');
    expect(connection.settings.port).toBe(3390);
    expect(connection.settings['read-only']).toBe(true);
  });
});
