/**
 * Protocol connection builder barrel file.
 *
 * @packageDocumentation
 */

export { BaseConnectionBuilder } from './base';
export { RDPConnectionBuilder } from './rdp';
export { VNCConnectionBuilder } from './vnc';
export { SSHConnectionBuilder } from './ssh';
export { TelnetConnectionBuilder } from './telnet';

import { RDPConnectionBuilder } from './rdp';
import { VNCConnectionBuilder } from './vnc';
import { SSHConnectionBuilder } from './ssh';
import { TelnetConnectionBuilder } from './telnet';

/**
 * Create a protocol-specific connection builder.
 *
 * @example
 * ```ts
 * const rdp = createConnectionBuilder('rdp')
 *   .hostname('10.0.0.1')
 *   .username('admin')
 *   .password('secret')
 *   .build();
 * ```
 */
export function createConnectionBuilder(protocol: 'rdp'): RDPConnectionBuilder;
export function createConnectionBuilder(protocol: 'vnc'): VNCConnectionBuilder;
export function createConnectionBuilder(protocol: 'ssh'): SSHConnectionBuilder;
export function createConnectionBuilder(protocol: 'telnet'): TelnetConnectionBuilder;
export function createConnectionBuilder(
  protocol: 'rdp' | 'vnc' | 'ssh' | 'telnet'
): RDPConnectionBuilder | VNCConnectionBuilder | SSHConnectionBuilder | TelnetConnectionBuilder {
  switch (protocol) {
    case 'rdp':
      return new RDPConnectionBuilder();
    case 'vnc':
      return new VNCConnectionBuilder();
    case 'ssh':
      return new SSHConnectionBuilder();
    case 'telnet':
      return new TelnetConnectionBuilder();
    default:
      throw new Error(`Unsupported protocol: ${protocol as string}`);
  }
}
