import type { ProtocolSchema } from './index';

export const sshSchema: ProtocolSchema = {
  protocol: 'ssh',
  sections: [
    {
      title: 'Network',
      defaultOpen: true,
      fields: [
        { key: 'hostname', label: 'Hostname', type: 'string', required: true, placeholder: '10.0.0.1' },
        { key: 'port', label: 'Port', type: 'number', default: 22 },
        { key: 'host-key', label: 'Host Key', type: 'string', placeholder: 'ssh-rsa AAAA...' },
        { key: 'known-hosts', label: 'Known Hosts', type: 'textarea' },
      ],
    },
    {
      title: 'Authentication',
      defaultOpen: true,
      fields: [
        { key: 'username', label: 'Username', type: 'string', placeholder: 'sshuser' },
        { key: 'password', label: 'Password', type: 'password' },
        { key: 'private-key', label: 'Private Key', type: 'textarea', placeholder: '-----BEGIN OPENSSH PRIVATE KEY-----' },
        { key: 'passphrase', label: 'Passphrase', type: 'password' },
      ],
    },
    {
      title: 'Terminal',
      fields: [
        { key: 'width', label: 'Width (px)', type: 'number', default: 1280 },
        { key: 'height', label: 'Height (px)', type: 'number', default: 720 },
        { key: 'dpi', label: 'DPI', type: 'number', default: 96 },
        { key: 'font-name', label: 'Font Name', type: 'string', placeholder: 'monospace' },
        { key: 'font-size', label: 'Font Size', type: 'number', default: 12 },
        { key: 'scrollback', label: 'Scrollback Lines', type: 'number', default: 1000 },
        {
          key: 'color-scheme',
          label: 'Color Scheme',
          type: 'select',
          options: [
            { value: '', label: '(default)' },
            { value: 'black-white', label: 'black-white' },
            { value: 'white-black', label: 'white-black' },
            { value: 'gray-black', label: 'gray-black' },
            { value: 'green-black', label: 'green-black' },
          ],
        },
        { key: 'backspace', label: 'Backspace Code', type: 'number', placeholder: '127' },
        { key: 'terminal-type', label: 'Terminal Type', type: 'string', placeholder: 'xterm-256color' },
        { key: 'locale', label: 'Locale', type: 'string', placeholder: 'ja_JP.UTF-8' },
        { key: 'timezone', label: 'Timezone', type: 'string', placeholder: 'Asia/Tokyo' },
        { key: 'read-only', label: 'Read Only', type: 'boolean' },
      ],
    },
    {
      title: 'Clipboard',
      fields: [
        { key: 'disable-clipboard', label: 'Disable Clipboard', type: 'boolean' },
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
      title: 'SSH Agent',
      fields: [
        { key: 'enable-agent-forwarding', label: 'Enable Agent Forwarding', type: 'boolean' },
      ],
    },
    {
      title: 'SFTP',
      fields: [
        { key: 'enable-sftp', label: 'Enable SFTP', type: 'boolean' },
        { key: 'sftp-root-directory', label: 'Root Directory', type: 'string', placeholder: '/home/user' },
        { key: 'sftp-disable-download', label: 'Disable Download', type: 'boolean' },
        { key: 'sftp-disable-upload', label: 'Disable Upload', type: 'boolean' },
      ],
    },
    {
      title: 'Session Recording',
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
      title: 'Typescript',
      fields: [
        { key: 'typescript-path', label: 'Typescript Path', type: 'string', placeholder: '/var/guac-typescript' },
        { key: 'typescript-name', label: 'Typescript Name', type: 'string' },
        { key: 'create-typescript-path', label: 'Create Path', type: 'boolean' },
        { key: 'typescript-write-existing', label: 'Write Existing', type: 'boolean' },
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
  ],
};
