import type { RdpConnectionParameters } from './rdp';
import type { VncConnectionParameters } from './vnc';
import type { SshConnectionParameters } from './ssh';
import type { TelnetConnectionParameters } from './telnet';

export type { RdpConnectionParameters, RdpResizeMethod, RdpSecurityMode } from './rdp';
export type { VncConnectionParameters, VncCursorMode } from './vnc';
export type { SshConnectionParameters, SshTerminalColorScheme } from './ssh';
export type { TelnetConnectionParameters, TelnetTerminalColorScheme } from './telnet';

export type ConnectionParameters =
  | RdpConnectionParameters
  | VncConnectionParameters
  | SshConnectionParameters
  | TelnetConnectionParameters;
