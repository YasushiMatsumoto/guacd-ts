import type { ProtocolSchema } from './index';

export const telnetSchema: ProtocolSchema = {
  protocol: 'telnet',
  sections: [
    {
      title: 'Network',
      defaultOpen: true,
      fields: [
        { key: 'hostname', label: 'Hostname', type: 'string', required: true, placeholder: '10.0.0.1' },
        { key: 'port', label: 'Port', type: 'number', default: 23 },
      ],
    },
    {
      title: 'Authentication',
      defaultOpen: true,
      fields: [
        { key: 'username', label: 'Username', type: 'string', placeholder: 'telnetuser' },
        { key: 'password', label: 'Password', type: 'password' },
      ],
    },
    {
      title: 'Login Detection',
      fields: [
        { key: 'username-regex', label: 'Username Prompt Regex', type: 'string', placeholder: 'Username:' },
        { key: 'password-regex', label: 'Password Prompt Regex', type: 'string', placeholder: 'Password:' },
        { key: 'login-success-regex', label: 'Login Success Regex', type: 'string' },
        { key: 'login-failure-regex', label: 'Login Failure Regex', type: 'string' },
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
