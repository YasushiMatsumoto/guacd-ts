import type { TelnetConnectionParams, TerminalColorScheme } from '../protocols/types';
import type { CamelizeKeys } from './shared';

export type TelnetTerminalColorScheme = TerminalColorScheme;

export type TelnetConnectionParameters = CamelizeKeys<Omit<TelnetConnectionParams, 'type'>>;
