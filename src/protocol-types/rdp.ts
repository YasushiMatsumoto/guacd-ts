import type { RDPConnectionParams } from '../protocols/types';
import type { CamelizeKeys } from './shared';

export type RdpSecurityMode = RDPConnectionParams['security'];
export type RdpResizeMethod = RDPConnectionParams['resize-method'];

export type RdpConnectionParameters = CamelizeKeys<Omit<RDPConnectionParams, 'type'>>;
