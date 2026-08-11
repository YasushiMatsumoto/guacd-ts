import type { SSHConnectionParams, TerminalColorScheme } from '../protocols/types';
import type { CamelizeKeys } from './shared';

export type SshTerminalColorScheme = TerminalColorScheme;

export type SshConnectionParameters = CamelizeKeys<Omit<SSHConnectionParams, 'type'>>;
