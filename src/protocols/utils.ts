/**
 * Protocol detection and utility functions.
 *
 * @packageDocumentation
 */

import type { ProtocolType } from '../types';
import { DEFAULT_PORTS } from './types';

/**
 * Detect protocol type from a well-known port number.
 *
 * @returns The matching protocol, or `null` if the port is not recognised.
 */
export function detectProtocolFromPort(port: number): ProtocolType | null {
  const portToProtocol: Record<number, ProtocolType> = {
    [DEFAULT_PORTS.rdp]: 'rdp',
    [DEFAULT_PORTS.vnc]: 'vnc',
    [DEFAULT_PORTS.ssh]: 'ssh',
    [DEFAULT_PORTS.telnet]: 'telnet',
    // Common VNC alternative ports
    5901: 'vnc',
    5902: 'vnc',
    5903: 'vnc',
  };

  return portToProtocol[port] ?? null;
}

/**
 * Get the default port for a given protocol.
 */
export function getDefaultPort(protocol: ProtocolType): number {
  return DEFAULT_PORTS[protocol];
}

/**
 * Whether the protocol supports SFTP / drive file transfer.
 */
export function supportsFileTransfer(protocol: ProtocolType): boolean {
  return ['rdp', 'vnc', 'ssh'].includes(protocol);
}

/**
 * Whether the protocol supports audio playback.
 */
export function supportsAudio(protocol: ProtocolType): boolean {
  return ['rdp', 'vnc'].includes(protocol);
}

/**
 * Whether the protocol renders a text terminal.
 */
export function isTerminalProtocol(protocol: ProtocolType): boolean {
  return ['ssh', 'telnet'].includes(protocol);
}

/**
 * Whether the protocol renders a graphical desktop.
 */
export function isGraphicalProtocol(protocol: ProtocolType): boolean {
  return ['rdp', 'vnc'].includes(protocol);
}

/**
 * Human-readable display name for a protocol.
 */
export function getProtocolDisplayName(protocol: ProtocolType): string {
  const names: Record<ProtocolType, string> = {
    rdp: 'Remote Desktop (RDP)',
    vnc: 'VNC',
    ssh: 'SSH',
    telnet: 'Telnet',
  };
  return names[protocol];
}

/**
 * Recommended colour depth for graphical protocols, or `null` for
 * terminal-based ones.
 */
export function getRecommendedColorDepth(protocol: ProtocolType): 8 | 16 | 24 | 32 | null {
  if (protocol === 'rdp' || protocol === 'vnc') return 24;
  return null;
}

/**
 * Parse a connection URI such as `rdp://user:pass@host:3389`.
 */
export function parseConnectionString(connectionString: string): {
  protocol: ProtocolType | null;
  hostname: string;
  port?: number;
  username?: string;
  password?: string;
} | null {
  try {
    const parsed = new URL(connectionString);
    const protocol = parsed.protocol.replace(':', '') as ProtocolType;

    if (!(protocol in DEFAULT_PORTS)) return null;

    const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

    return {
      protocol,
      hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : undefined,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    };
  } catch {
    return null;
  }
}
