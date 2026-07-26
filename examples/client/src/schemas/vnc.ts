import type { ProtocolSchema } from './index';

export const vncSchema: ProtocolSchema = {
  protocol: 'vnc',
  sections: [
    {
      title: 'Network',
      defaultOpen: true,
      fields: [
        { key: 'hostname', label: 'Hostname', type: 'string', required: true, placeholder: '10.0.0.1' },
        { key: 'port', label: 'Port', type: 'number', default: 5900 },
        { key: 'autoretry', label: 'Auto Retry', type: 'number', placeholder: '0' },
      ],
    },
    {
      title: 'Authentication',
      defaultOpen: true,
      fields: [
        { key: 'username', label: 'Username', type: 'string' },
        { key: 'password', label: 'Password', type: 'password' },
      ],
    },
    {
      title: 'Display',
      fields: [
        {
          key: 'cursor',
          label: 'Cursor',
          type: 'select',
          options: [
            { value: '', label: '(default)' },
            { value: 'local', label: 'local' },
            { value: 'remote', label: 'remote' },
          ],
        },
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
        { key: 'swap-red-blue', label: 'Swap Red/Blue', type: 'boolean' },
        { key: 'force-lossless', label: 'Force Lossless', type: 'boolean' },
        { key: 'compress-level', label: 'Compress Level (0-9)', type: 'number' },
        { key: 'quality-level', label: 'Quality Level (0-9)', type: 'number' },
        { key: 'encodings', label: 'Encodings', type: 'string', placeholder: 'zrle ultra copyrect hextile zlib corre rre raw' },
      ],
    },
    {
      title: 'Clipboard',
      fields: [
        { key: 'read-only', label: 'Read Only', type: 'boolean' },
        { key: 'disable-copy', label: 'Disable Copy', type: 'boolean' },
        { key: 'disable-paste', label: 'Disable Paste', type: 'boolean' },
        {
          key: 'clipboard-encoding',
          label: 'Clipboard Encoding',
          type: 'select',
          options: [
            { value: '', label: '(default ISO 8859-1)' },
            { value: 'UTF-8', label: 'UTF-8' },
            { value: 'UTF-16', label: 'UTF-16' },
            { value: 'ISO8859-1', label: 'ISO 8859-1' },
          ],
        },
      ],
    },
    {
      title: 'Reverse Connect',
      fields: [
        { key: 'reverse-connect', label: 'Reverse Connect', type: 'boolean' },
        { key: 'listen-timeout', label: 'Listen Timeout (ms)', type: 'number', placeholder: '5000' },
      ],
    },
    {
      title: 'Repeater',
      fields: [
        { key: 'dest-host', label: 'Repeater Host', type: 'string' },
        { key: 'dest-port', label: 'Repeater Port', type: 'number' },
      ],
    },
    {
      title: 'SFTP',
      fields: [
        { key: 'enable-sftp', label: 'Enable SFTP', type: 'boolean' },
        { key: 'sftp-hostname', label: 'SFTP Hostname', type: 'string' },
        { key: 'sftp-port', label: 'SFTP Port', type: 'number', default: 22 },
        { key: 'sftp-username', label: 'SFTP Username', type: 'string', required: true },
        { key: 'sftp-password', label: 'SFTP Password', type: 'password' },
        { key: 'sftp-private-key', label: 'SFTP Private Key', type: 'textarea' },
        { key: 'sftp-passphrase', label: 'SFTP Passphrase', type: 'password' },
        { key: 'sftp-host-key', label: 'SFTP Host Key', type: 'string' },
        { key: 'sftp-root-directory', label: 'Root Directory', type: 'string' },
        { key: 'sftp-directory', label: 'Working Directory', type: 'string' },
        { key: 'sftp-disable-download', label: 'Disable Download', type: 'boolean' },
        { key: 'sftp-disable-upload', label: 'Disable Upload', type: 'boolean' },
        { key: 'sftp-keep-alive', label: 'Keep-Alive Interval (sec)', type: 'number' },
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
    {
      title: 'Timezone',
      fields: [
        { key: 'timezone', label: 'Timezone', type: 'string', placeholder: 'Asia/Tokyo' },
      ],
    },
  ],
};
