import type { VNCConnectionParams } from '../protocols/types';
import type { CamelizeKeys } from './shared';

export type VncCursorMode = VNCConnectionParams['cursor'];

export type VncConnectionParameters = CamelizeKeys<Omit<VNCConnectionParams, 'type'>>;
