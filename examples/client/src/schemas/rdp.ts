import type { ProtocolSchema } from './index';

export const rdpSchema: ProtocolSchema = {
  protocol: 'rdp',
  sections: [
    {
      title: 'Network',
      defaultOpen: true,
      fields: [
        { key: 'hostname', label: 'Hostname', type: 'string', required: true, placeholder: '10.0.0.1' },
        { key: 'port', label: 'Port', type: 'number', default: 3389 },
        { key: 'timeout', label: 'Timeout (sec)', type: 'number', placeholder: '30' },
      ],
    },
    {
      title: 'Authentication',
      defaultOpen: true,
      fields: [
        { key: 'username', label: 'Username', type: 'string', placeholder: 'rdpuser' },
        { key: 'password', label: 'Password', type: 'password' },
        { key: 'domain', label: 'Domain', type: 'string' },
        { key: 'disable-auth', label: 'Disable Auth', type: 'boolean' },
      ],
    },
    {
      title: 'Security',
      fields: [
        {
          key: 'security',
          label: 'Security Mode',
          type: 'select',
          options: [
            { value: '', label: '(default)' },
            { value: 'any', label: 'any' },
            { value: 'nla', label: 'NLA' },
            { value: 'nla-ext', label: 'NLA Extended' },
            { value: 'tls', label: 'TLS' },
            { value: 'rdp', label: 'RDP' },
            { value: 'vmconnect', label: 'vmconnect' },
          ],
        },
        { key: 'ignore-cert', label: 'Ignore Certificate', type: 'boolean' },
        { key: 'cert-tofu', label: 'Certificate TOFU', type: 'boolean' },
        { key: 'cert-fingerprints', label: 'Cert Fingerprints', type: 'string', placeholder: 'sha256:...' },
      ],
    },
    {
      title: 'Display',
      fields: [
        { key: 'width', label: 'Width', type: 'number', placeholder: '1280' },
        { key: 'height', label: 'Height', type: 'number', placeholder: '720' },
        { key: 'dpi', label: 'DPI', type: 'number', default: 96 },
        {
          key: 'color-depth',
          label: 'Color Depth',
          type: 'select',
          options: [
            { value: '', label: '(default)' },
            { value: '8', label: '8 bpp' },
            { value: '16', label: '16 bpp' },
            { value: '24', label: '24 bpp' },
            { value: '32', label: '32 bpp' },
          ],
        },
        {
          key: 'resize-method',
          label: 'Resize Method',
          type: 'select',
          options: [
            { value: '', label: '(default)' },
            { value: 'display-update', label: 'display-update' },
            { value: 'reconnect', label: 'reconnect' },
          ],
        },
        { key: 'force-lossless', label: 'Force Lossless', type: 'boolean' },
        { key: 'enable-touch', label: 'Enable Touch', type: 'boolean' },
        { key: 'server-layout', label: 'Server Keyboard Layout', type: 'string', placeholder: 'en-us-qwerty' },
      ],
    },
    {
      title: 'Performance',
      fields: [
        { key: 'enable-wallpaper', label: 'Enable Wallpaper', type: 'boolean' },
        { key: 'enable-theming', label: 'Enable Theming', type: 'boolean' },
        { key: 'enable-font-smoothing', label: 'Font Smoothing', type: 'boolean' },
        { key: 'enable-full-window-drag', label: 'Full Window Drag', type: 'boolean' },
        { key: 'enable-desktop-composition', label: 'Desktop Composition', type: 'boolean' },
        { key: 'enable-menu-animations', label: 'Menu Animations', type: 'boolean' },
        { key: 'disable-gfx', label: 'Disable GFX', type: 'boolean' },
        { key: 'disable-bitmap-caching', label: 'Disable Bitmap Cache', type: 'boolean' },
        { key: 'disable-offscreen-caching', label: 'Disable Offscreen Cache', type: 'boolean' },
        { key: 'disable-glyph-caching', label: 'Disable Glyph Cache', type: 'boolean' },
      ],
    },
    {
      title: 'Audio',
      fields: [
        { key: 'disable-audio', label: 'Disable Audio', type: 'boolean' },
        { key: 'enable-audio-input', label: 'Enable Audio Input', type: 'boolean' },
        { key: 'console-audio', label: 'Console Audio', type: 'boolean' },
      ],
    },
    {
      title: 'Clipboard',
      fields: [
        { key: 'read-only', label: 'Read Only', type: 'boolean' },
        { key: 'disable-copy', label: 'Disable Copy', type: 'boolean' },
        { key: 'disable-paste', label: 'Disable Paste', type: 'boolean' },
        {
          key: 'normalize-clipboard',
          label: 'Normalize Clipboard',
          type: 'select',
          options: [
            { value: '', label: '(default)' },
            { value: 'preserve', label: 'preserve' },
            { value: 'unix', label: 'unix (LF)' },
            { value: 'windows', label: 'windows (CRLF)' },
          ],
        },
      ],
    },
    {
      title: 'Printing',
      fields: [
        { key: 'enable-printing', label: 'Enable Printing', type: 'boolean' },
        { key: 'printer-name', label: 'Printer Name', type: 'string' },
      ],
    },
    {
      title: 'Drive',
      fields: [
        { key: 'enable-drive', label: 'Enable Drive', type: 'boolean' },
        { key: 'drive-path', label: 'Drive Path', type: 'string', placeholder: '/tmp/guac-drive' },
        { key: 'drive-name', label: 'Drive Name', type: 'string', placeholder: 'Guacamole' },
        { key: 'create-drive-path', label: 'Create Drive Path', type: 'boolean' },
        { key: 'disable-download', label: 'Disable Download', type: 'boolean' },
        { key: 'disable-upload', label: 'Disable Upload', type: 'boolean' },
      ],
    },
    {
      title: 'SFTP',
      fields: [
        { key: 'enable-sftp', label: 'Enable SFTP', type: 'boolean' },
        { key: 'sftp-hostname', label: 'SFTP Hostname', type: 'string' },
        { key: 'sftp-port', label: 'SFTP Port', type: 'number', default: 22 },
        { key: 'sftp-username', label: 'SFTP Username', type: 'string' },
        { key: 'sftp-password', label: 'SFTP Password', type: 'password' },
        { key: 'sftp-private-key', label: 'SFTP Private Key', type: 'textarea' },
        { key: 'sftp-passphrase', label: 'SFTP Passphrase', type: 'password' },
        { key: 'sftp-root-directory', label: 'Root Directory', type: 'string', placeholder: '/home/user' },
        { key: 'sftp-directory', label: 'Working Directory', type: 'string' },
        { key: 'sftp-disable-download', label: 'Disable Download', type: 'boolean' },
        { key: 'sftp-disable-upload', label: 'Disable Upload', type: 'boolean' },
        { key: 'sftp-keep-alive', label: 'Keep-Alive Interval (sec)', type: 'number' },
      ],
    },
    {
      title: 'RemoteApp',
      fields: [
        { key: 'remote-app', label: 'Remote App', type: 'string', placeholder: '||notepad' },
        { key: 'remote-app-args', label: 'Remote App Args', type: 'string' },
        { key: 'remote-app-dir', label: 'Remote App Dir', type: 'string' },
      ],
    },
    {
      title: 'Gateway (RD Gateway)',
      fields: [
        { key: 'gateway-hostname', label: 'Gateway Hostname', type: 'string' },
        { key: 'gateway-port', label: 'Gateway Port', type: 'number', default: 443 },
        { key: 'gateway-username', label: 'Gateway Username', type: 'string' },
        { key: 'gateway-password', label: 'Gateway Password', type: 'password' },
        { key: 'gateway-domain', label: 'Gateway Domain', type: 'string' },
      ],
    },
    {
      title: 'Session',
      fields: [
        { key: 'console', label: 'Admin Console', type: 'boolean' },
        { key: 'initial-program', label: 'Initial Program', type: 'string' },
        { key: 'timezone', label: 'Timezone', type: 'string', placeholder: 'Asia/Tokyo' },
        { key: 'client-name', label: 'Client Name', type: 'string' },
        { key: 'static-channels', label: 'Static Channels', type: 'string' },
        { key: 'load-balance-info', label: 'Load Balance Info', type: 'string' },
        { key: 'preconnection-id', label: 'Preconnection ID', type: 'number' },
        { key: 'preconnection-blob', label: 'Preconnection BLOB', type: 'string' },
      ],
    },
    {
      title: 'Wake-on-LAN',
      fields: [
        { key: 'wol-send-packet', label: 'Send WoL Packet', type: 'boolean' },
        { key: 'wol-mac-addr', label: 'MAC Address', type: 'string', placeholder: 'aa:bb:cc:dd:ee:ff' },
        { key: 'wol-broadcast-addr', label: 'Broadcast Address', type: 'string' },
        { key: 'wol-udp-port', label: 'UDP Port', type: 'number', default: 9 },
        { key: 'wol-wait-time', label: 'Wait Time (sec)', type: 'number' },
      ],
    },
    {
      title: 'Recording',
      fields: [
        { key: 'recording-path', label: 'Recording Path', type: 'string', placeholder: '/var/guac-recordings' },
        { key: 'recording-name', label: 'Recording Name', type: 'string' },
        { key: 'recording-exclude-output', label: 'Exclude Output', type: 'boolean' },
        { key: 'recording-exclude-mouse', label: 'Exclude Mouse', type: 'boolean' },
        { key: 'recording-include-keys', label: 'Include Keys', type: 'boolean' },
        { key: 'create-recording-path', label: 'Create Path', type: 'boolean' },
        { key: 'recording-write-existing', label: 'Write Existing', type: 'boolean' },
      ],
    },
  ],
};
