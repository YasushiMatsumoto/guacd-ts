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
      const connection = new RDPConnectionBuilder()
        .hostname('192.168.1.100')
        .username('user')
        .build();

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
        .username('user')
        .drive({ path: '/home/user/shared', name: 'MyDrive' })
        .build();

      expect(connection.settings['enable-drive']).toBe(true);
      expect(connection.settings['drive-path']).toBe('/home/user/shared');
      expect(connection.settings['drive-name']).toBe('MyDrive');
      expect(connection.settings['create-drive-path']).toBe(true);
    });

    it('should configure drive with download/upload restrictions', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .username('user')
        .drive({ path: '/shared', disableDownload: true, disableUpload: false })
        .build();

      expect(connection.settings['disable-download']).toBe(true);
      expect(connection.settings['disable-upload']).toBe(false);
    });

    it('should configure RemoteApp', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .username('user')
        .remoteApp({ program: 'calc.exe', args: '/option', workDir: 'C:\\' })
        .build();

      expect(connection.settings['remote-app']).toBe('calc.exe');
      expect(connection.settings['remote-app-args']).toBe('/option');
      expect(connection.settings['remote-app-dir']).toBe('C:\\');
    });

    it('should configure gateway with domain', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('internal-server')
        .username('user')
        .gateway({ hostname: 'gateway.example.com', username: 'gwuser', password: 'gwpass', port: 443, domain: 'CORP' })
        .build();

      expect(connection.settings['gateway-hostname']).toBe('gateway.example.com');
      expect(connection.settings['gateway-port']).toBe(443);
      expect(connection.settings['gateway-username']).toBe('gwuser');
      expect(connection.settings['gateway-password']).toBe('gwpass');
      expect(connection.settings['gateway-domain']).toBe('CORP');
    });

    it('should configure performance flags including caching', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .username('user')
        .performanceFlags({
          wallpaper: true,
          theming: true,
          fontSmoothing: true,
          fullWindowDrag: false,
          disableGfx: true,
          disableBitmapCaching: true,
        })
        .build();

      expect(connection.settings['enable-wallpaper']).toBe(true);
      expect(connection.settings['enable-theming']).toBe(true);
      expect(connection.settings['enable-font-smoothing']).toBe(true);
      expect(connection.settings['enable-full-window-drag']).toBe(false);
      expect(connection.settings['disable-gfx']).toBe(true);
      expect(connection.settings['disable-bitmap-caching']).toBe(true);
    });

    it('should configure recording with full options', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .username('user')
        .recording({
          path: '/var/recordings',
          name: 'session-1',
          excludeOutput: false,
          excludeMouse: true,
          includeKeys: true,
        })
        .build();

      expect(connection.settings['recording-path']).toBe('/var/recordings');
      expect(connection.settings['recording-name']).toBe('session-1');
      expect(connection.settings['create-recording-path']).toBe(true);
      expect(connection.settings['recording-exclude-output']).toBe(false);
      expect(connection.settings['recording-exclude-mouse']).toBe(true);
      expect(connection.settings['recording-include-keys']).toBe(true);
    });

    it('should configure SFTP with option object', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .username('user')
        .sftp({ hostname: 'sftp.example.com', username: 'sftpuser', password: 'sftppass', port: 22 })
        .build();

      expect(connection.settings['enable-sftp']).toBe(true);
      expect(connection.settings['sftp-hostname']).toBe('sftp.example.com');
      expect(connection.settings['sftp-username']).toBe('sftpuser');
      expect(connection.settings['sftp-password']).toBe('sftppass');
      expect(connection.settings['sftp-port']).toBe(22);
    });

    it('should configure session settings', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .username('user')
        .timezone('Asia/Tokyo')
        .clientName('my-workstation')
        .initialProgram('notepad.exe')
        .adminConsole()
        .build();

      expect(connection.settings.timezone).toBe('Asia/Tokyo');
      expect(connection.settings['client-name']).toBe('my-workstation');
      expect(connection.settings['initial-program']).toBe('notepad.exe');
      expect(connection.settings.console).toBe(true);
    });

    it('should configure preconnection (Hyper-V)', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('hyperv-host')
        .username('user')
        .preconnection({ id: 1234, blob: 'vm-guid-blob' })
        .build();

      expect(connection.settings['preconnection-id']).toBe(1234);
      expect(connection.settings['preconnection-blob']).toBe('vm-guid-blob');
    });

    it('should configure Wake-on-LAN', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .username('user')
        .wakeOnLan({ macAddr: '00:11:22:33:44:55', broadcastAddr: '255.255.255.0', waitTime: 10 })
        .build();

      expect(connection.settings['wol-send-packet']).toBe(true);
      expect(connection.settings['wol-mac-addr']).toBe('00:11:22:33:44:55');
      expect(connection.settings['wol-broadcast-addr']).toBe('255.255.255.0');
      expect(connection.settings['wol-wait-time']).toBe(10);
    });

    it('should configure static channels', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .username('user')
        .staticChannels(['MYAPP', 'CHAT'])
        .build();

      expect(connection.settings['static-channels']).toBe('MYAPP,CHAT');
    });

    it('should configure load balance info', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('rdcb.corp.com')
        .username('user')
        .loadBalanceInfo('tsv://MS Terminal Services Plugin.1.Default')
        .build();

      expect(connection.settings['load-balance-info']).toBe('tsv://MS Terminal Services Plugin.1.Default');
    });

    it('should disable auth and audio', () => {
      const connection = new RDPConnectionBuilder()
        .hostname('server')
        .username('user')
        .disableAuth()
        .disableAudio()
        .consoleAudio()
        .build();

      expect(connection.settings['disable-auth']).toBe(true);
      expect(connection.settings['disable-audio']).toBe(true);
      expect(connection.settings['console-audio']).toBe(true);
    });
  });

  describe('validation', () => {
    it('should validate successfully with required fields', () => {
      const result = new RDPConnectionBuilder().hostname('server').username('user').validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail without hostname', () => {
      const result = new RDPConnectionBuilder().validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('hostname is required');
    });

    it('should fail without username', () => {
      const result = new RDPConnectionBuilder().hostname('server').validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('username is required');
    });

    it('should fail with invalid port', () => {
      const result = new RDPConnectionBuilder().hostname('server').port(99999).validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('port must be between 1 and 65535');
    });

    it('should fail when wakeOnLan has no macAddr', () => {
      const result = new RDPConnectionBuilder()
        .hostname('server').username('user')
        .withParams({ 'wol-send-packet': true })
        .validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('wakeOnLan: wol-mac-addr is required when wol-send-packet is enabled');
    });

    it('should fail when enable-drive has no drive-path', () => {
      const result = new RDPConnectionBuilder()
        .hostname('server').username('user')
        .withParams({ 'enable-drive': true })
        .validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('drive: drive-path is required when enable-drive is set');
    });

    it('should fail when enable-sftp has no sftp-username', () => {
      const result = new RDPConnectionBuilder()
        .hostname('server').username('user')
        .withParams({ 'enable-sftp': true })
        .validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('sftp: sftp-username is required when enable-sftp is set');
    });

    it('should warn for NLA without password', () => {
      const result = new RDPConnectionBuilder()
        .hostname('server').username('user').security('nla').validate();
      expect(result.warnings).toContain('NLA selected but password is empty — authentication will likely fail');
    });

    it('should warn for legacy rdp security', () => {
      const result = new RDPConnectionBuilder()
        .hostname('server').username('user').security('rdp').validate();
      expect(result.warnings.some((w) => w.includes("legacy NTLMv1"))).toBe(true);
    });

    it('should warn when ignore-cert and cert-fingerprints conflict', () => {
      const result = new RDPConnectionBuilder()
        .hostname('server').username('user')
        .ignoreCert().certFingerprints('AA:BB:CC')
        .validate();
      expect(result.warnings.some((w) => w.includes('fingerprints will have no effect'))).toBe(true);
    });

    it('should warn when remote-app and console conflict', () => {
      const result = new RDPConnectionBuilder()
        .hostname('server').username('user')
        .remoteApp({ program: '||Chrome' }).adminConsole()
        .validate();
      expect(result.warnings.some((w) => w.includes('mutually exclusive'))).toBe(true);
    });

    it('should warn when disable-auth is used without nla', () => {
      const result = new RDPConnectionBuilder()
        .hostname('server').username('user')
        .disableAuth().security('tls')
        .validate();
      expect(result.warnings.some((w) => w.includes('disable-auth only applies'))).toBe(true);
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

  it('should configure display options', () => {
    const connection = new VNCConnectionBuilder()
      .hostname('server')
      .password('pass')
      .colorDepth(32)
      .forceLossless()
      .swapRedBlue()
      .compressLevel(6)
      .qualityLevel(8)
      .encodings(['zrle', 'hextile', 'raw'])
      .build();

    expect(connection.settings['color-depth']).toBe(32);
    expect(connection.settings['force-lossless']).toBe(true);
    expect(connection.settings['swap-red-blue']).toBe(true);
    expect(connection.settings['compress-level']).toBe(6);
    expect(connection.settings['quality-level']).toBe(8);
    expect(connection.settings.encodings).toEqual(['zrle', 'hextile', 'raw']);
  });

  it('should configure SFTP with option object', () => {
    const connection = new VNCConnectionBuilder()
      .hostname('vnc-server')
      .password('vncpass')
      .sftp({ hostname: 'sftp.example.com', username: 'sftpuser', password: 'sftppass', port: 22 })
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

  it('should configure clipboard controls', () => {
    const connection = new VNCConnectionBuilder()
      .hostname('server')
      .password('pass')
      .disableClipboard()
      .clipboardEncoding('ISO8859-1')
      .build();

    expect(connection.settings['disable-copy']).toBe(true);
    expect(connection.settings['disable-paste']).toBe(true);
    expect(connection.settings['clipboard-encoding']).toBe('ISO8859-1');
  });

  it('should configure auto-retry', () => {
    const connection = new VNCConnectionBuilder().hostname('server').autoRetry(5).build();

    expect(connection.settings.autoretry).toBe(5);
  });

  it('should configure reverse connection', () => {
    const connection = new VNCConnectionBuilder()
      .hostname('server')
      .reverseConnect(10000)
      .build();

    expect(connection.settings['reverse-connect']).toBe(true);
    expect(connection.settings['listen-timeout']).toBe(10000);
  });

  it('should configure repeater', () => {
    const connection = new VNCConnectionBuilder()
      .hostname('server')
      .password('pass')
      .repeater({ host: 'repeater.example.com', port: 5900 })
      .build();

    expect(connection.settings['dest-host']).toBe('repeater.example.com');
    expect(connection.settings['dest-port']).toBe(5900);
  });

  it('should configure Wake-on-LAN', () => {
    const connection = new VNCConnectionBuilder()
      .hostname('server')
      .password('pass')
      .wakeOnLan({ macAddr: 'AA:BB:CC:DD:EE:FF', udpPort: 9 })
      .build();

    expect(connection.settings['wol-send-packet']).toBe(true);
    expect(connection.settings['wol-mac-addr']).toBe('AA:BB:CC:DD:EE:FF');
    expect(connection.settings['wol-udp-port']).toBe(9);
  });

  it('should configure recording', () => {
    const connection = new VNCConnectionBuilder()
      .hostname('server')
      .password('pass')
      .recording({ path: '/var/recordings', excludeMouse: true, includeKeys: false })
      .build();

    expect(connection.settings['recording-path']).toBe('/var/recordings');
    expect(connection.settings['create-recording-path']).toBe(true);
    expect(connection.settings['recording-exclude-mouse']).toBe(true);
    expect(connection.settings['recording-include-keys']).toBe(false);
  });

  it('should configure timezone', () => {
    const connection = new VNCConnectionBuilder()
      .hostname('server')
      .password('pass')
      .timezone('Asia/Tokyo')
      .build();

    expect(connection.settings.timezone).toBe('Asia/Tokyo');
  });

  it('should fail validation — compressLevel out of range', () => {
    const result = new VNCConnectionBuilder()
      .hostname('server')
      .withParams({ 'compress-level': 10 })
      .validate();

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('compressLevel'))).toBe(true);
  });

  it('should fail validation — WoL without macAddr', () => {
    const result = new VNCConnectionBuilder()
      .hostname('server')
      .withParams({ 'wol-send-packet': true })
      .validate();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('wakeOnLan: wol-mac-addr is required when wol-send-packet is enabled');
  });

  it('should fail validation — SFTP without username', () => {
    const result = new VNCConnectionBuilder()
      .hostname('server')
      .withParams({ 'enable-sftp': true })
      .validate();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('sftp: sftp-username is required when enable-sftp is set');
  });

  it('should warn — reverse-connect with hostname set', () => {
    const result = new VNCConnectionBuilder()
      .hostname('server')
      .reverseConnect()
      .validate();

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('reverse-connect'))).toBe(true);
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
      .password('secret')
      .font('Courier New', 14)
      .colorScheme('solarized')
      .scrollback(2000)
      .backspace(127)
      .terminalType('xterm-256color')
      .build();

    expect(connection.settings['font-name']).toBe('Courier New');
    expect(connection.settings['font-size']).toBe(14);
    expect(connection.settings['color-scheme']).toBe('solarized');
    expect(connection.settings.scrollback).toBe(2000);
    expect(connection.settings.backspace).toBe(127);
    expect(connection.settings['terminal-type']).toBe('xterm-256color');
  });

  it('should enable SFTP with options', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .password('secret')
      .sftp({ rootDirectory: '/home/user', disableUpload: true })
      .build();

    expect(connection.settings['enable-sftp']).toBe(true);
    expect(connection.settings['sftp-root-directory']).toBe('/home/user');
    expect(connection.settings['sftp-disable-upload']).toBe(true);
  });

  it('should enable SFTP with no options', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .password('secret')
      .sftp()
      .build();

    expect(connection.settings['enable-sftp']).toBe(true);
  });

  it('should configure keep-alive', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .password('secret')
      .keepAlive(60)
      .build();

    expect(connection.settings['server-alive-interval']).toBe(60);
  });

  it('should configure command execution', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .password('secret')
      .command('ls -la')
      .build();

    expect(connection.settings.command).toBe('ls -la');
  });

  it('should configure clipboard controls', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .password('secret')
      .disableClipboard()
      .normalizeClipboard('unix')
      .build();

    expect(connection.settings['disable-copy']).toBe(true);
    expect(connection.settings['disable-paste']).toBe(true);
    expect(connection.settings['normalize-clipboard']).toBe('unix');
  });

  it('should configure recording', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .password('secret')
      .recording({ path: '/var/recordings', includeKeys: true, excludeMouse: true })
      .build();

    expect(connection.settings['recording-path']).toBe('/var/recordings');
    expect(connection.settings['create-recording-path']).toBe(true);
    expect(connection.settings['recording-include-keys']).toBe(true);
    expect(connection.settings['recording-exclude-mouse']).toBe(true);
  });

  it('should configure typescript logging', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .password('secret')
      .typescript({ path: '/var/logs', name: 'session.log', createPath: false })
      .build();

    expect(connection.settings['typescript-path']).toBe('/var/logs');
    expect(connection.settings['typescript-name']).toBe('session.log');
    expect(connection.settings['create-typescript-path']).toBe(false);
  });

  it('should configure Wake-on-LAN', () => {
    const connection = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .password('secret')
      .wakeOnLan({ macAddr: 'AA:BB:CC:DD:EE:FF', broadcastAddr: '192.168.1.255', waitTime: 5 })
      .build();

    expect(connection.settings['wol-send-packet']).toBe(true);
    expect(connection.settings['wol-mac-addr']).toBe('AA:BB:CC:DD:EE:FF');
    expect(connection.settings['wol-broadcast-addr']).toBe('192.168.1.255');
    expect(connection.settings['wol-wait-time']).toBe(5);
  });

  it('should fail validation — WoL without macAddr', () => {
    const result = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .password('secret')
      .withParams({ 'wol-send-packet': true })
      .validate();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('wakeOnLan: wol-mac-addr is required when wol-send-packet is enabled');
  });

  it('should warn — passphrase without private-key', () => {
    const result = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .password('secret')
      .withParams({ passphrase: 'orphan' })
      .validate();

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('passphrase'))).toBe(true);
  });

  it('should warn — both password and private-key set', () => {
    const result = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .password('secret')
      .privateKey('-----BEGIN RSA PRIVATE KEY-----')
      .validate();

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('private-key will be preferred'))).toBe(true);
  });

  it('should warn — public-key without private-key', () => {
    const result = new SSHConnectionBuilder()
      .hostname('server')
      .username('user')
      .password('secret')
      .publicKey('AAAA...')
      .validate();

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('public-key'))).toBe(true);
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
      .loginDetection({ usernameRegex: 'login:', passwordRegex: 'password:' })
      .build();

    expect(connection.settings.username).toBe('admin');
    expect(connection.settings.password).toBe('admin');
    expect(connection.settings['username-regex']).toBe('login:');
    expect(connection.settings['password-regex']).toBe('password:');
  });

  it('should configure login detection with all regexes', () => {
    const connection = new TelnetConnectionBuilder()
      .hostname('server')
      .loginDetection({
        usernameRegex: 'login:',
        passwordRegex: 'password:',
        successRegex: '\\$\\s*$',
        failureRegex: 'Login incorrect',
      })
      .build();

    expect(connection.settings['username-regex']).toBe('login:');
    expect(connection.settings['password-regex']).toBe('password:');
    expect(connection.settings['login-success-regex']).toBe('\\$\\s*$');
    expect(connection.settings['login-failure-regex']).toBe('Login incorrect');
  });

  it('should configure terminal settings', () => {
    const connection = new TelnetConnectionBuilder()
      .hostname('server')
      .font('Courier New', 14)
      .colorScheme('green-black')
      .scrollback(500)
      .backspace(8)
      .terminalType('vt100')
      .build();

    expect(connection.settings['font-name']).toBe('Courier New');
    expect(connection.settings['font-size']).toBe(14);
    expect(connection.settings['color-scheme']).toBe('green-black');
    expect(connection.settings.scrollback).toBe(500);
    expect(connection.settings.backspace).toBe(8);
    expect(connection.settings['terminal-type']).toBe('vt100');
  });

  it('should configure clipboard controls', () => {
    const connection = new TelnetConnectionBuilder()
      .hostname('server')
      .disableClipboard()
      .normalizeClipboard('windows')
      .build();

    expect(connection.settings['disable-copy']).toBe(true);
    expect(connection.settings['disable-paste']).toBe(true);
    expect(connection.settings['normalize-clipboard']).toBe('windows');
  });

  it('should configure recording', () => {
    const connection = new TelnetConnectionBuilder()
      .hostname('server')
      .recording({ path: '/var/recordings', includeKeys: true })
      .build();

    expect(connection.settings['recording-path']).toBe('/var/recordings');
    expect(connection.settings['create-recording-path']).toBe(true);
    expect(connection.settings['recording-include-keys']).toBe(true);
  });

  it('should configure typescript logging', () => {
    const connection = new TelnetConnectionBuilder()
      .hostname('server')
      .typescript({ path: '/var/logs', name: 'session.log' })
      .build();

    expect(connection.settings['typescript-path']).toBe('/var/logs');
    expect(connection.settings['typescript-name']).toBe('session.log');
    expect(connection.settings['create-typescript-path']).toBe(true);
  });

  it('should configure Wake-on-LAN', () => {
    const connection = new TelnetConnectionBuilder()
      .hostname('server')
      .wakeOnLan({ macAddr: 'AA:BB:CC:DD:EE:FF', waitTime: 10 })
      .build();

    expect(connection.settings['wol-send-packet']).toBe(true);
    expect(connection.settings['wol-mac-addr']).toBe('AA:BB:CC:DD:EE:FF');
    expect(connection.settings['wol-wait-time']).toBe(10);
  });

  it('should fail validation — WoL without macAddr', () => {
    const result = new TelnetConnectionBuilder()
      .hostname('server')
      .withParams({ 'wol-send-packet': true })
      .validate();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('wakeOnLan: wol-mac-addr is required when wol-send-packet is enabled');
  });

  it('should warn — credentials without loginDetection regexes', () => {
    const result = new TelnetConnectionBuilder()
      .hostname('server')
      .username('admin')
      .password('secret')
      .validate();

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('loginDetection'))).toBe(true);
  });

  it('should warn — success/failure regex without usernameRegex', () => {
    const result = new TelnetConnectionBuilder()
      .hostname('server')
      .loginDetection({ successRegex: '\\$' })
      .validate();

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('usernameRegex'))).toBe(true);
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
