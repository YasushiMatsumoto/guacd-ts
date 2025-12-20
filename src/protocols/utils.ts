/**
 * Protocol detection and utility functions
 */

import { ProtocolTypeLiteral, DEFAULT_PORTS } from './types';

/**
 * Detect protocol type from port number
 */
export function detectProtocolFromPort(port: number): ProtocolTypeLiteral | null {
  const portToProtocol: Record<number, ProtocolTypeLiteral> = {
    [DEFAULT_PORTS.rdp]: 'rdp',
    [DEFAULT_PORTS.vnc]: 'vnc',
    [DEFAULT_PORTS.ssh]: 'ssh',
    [DEFAULT_PORTS.telnet]: 'telnet',
    [DEFAULT_PORTS.kubernetes]: 'kubernetes',
    // Common VNC alternative ports
    5901: 'vnc',
    5902: 'vnc',
    5903: 'vnc',
  };

  return portToProtocol[port] || null;
}

/**
 * Get default port for protocol
 */
export function getDefaultPort(protocol: ProtocolTypeLiteral): number {
  return DEFAULT_PORTS[protocol];
}

/**
 * Check if protocol supports file transfer
 */
export function supportsFileTransfer(protocol: ProtocolTypeLiteral): boolean {
  return ['rdp', 'vnc', 'ssh'].includes(protocol);
}

/**
 * Check if protocol supports audio
 */
export function supportsAudio(protocol: ProtocolTypeLiteral): boolean {
  return ['rdp', 'vnc'].includes(protocol);
}

/**
 * Check if protocol is terminal-based
 */
export function isTerminalProtocol(protocol: ProtocolTypeLiteral): boolean {
  return ['ssh', 'telnet', 'kubernetes'].includes(protocol);
}

/**
 * Check if protocol is graphical
 */
export function isGraphicalProtocol(protocol: ProtocolTypeLiteral): boolean {
  return ['rdp', 'vnc'].includes(protocol);
}

/**
 * Get protocol display name
 */
export function getProtocolDisplayName(protocol: ProtocolTypeLiteral): string {
  const names: Record<ProtocolTypeLiteral, string> = {
    rdp: 'Remote Desktop (RDP)',
    vnc: 'VNC',
    ssh: 'SSH',
    telnet: 'Telnet',
    kubernetes: 'Kubernetes',
  };
  return names[protocol];
}

/**
 * Get recommended color depth for protocol
 */
export function getRecommendedColorDepth(protocol: ProtocolTypeLiteral): 8 | 16 | 24 | 32 | null {
  if (protocol === 'rdp') return 24;
  if (protocol === 'vnc') return 24;
  return null;
}

/**
 * Parse connection string (e.g., "rdp://hostname:3389" or "rdp://user:pass@host:3389")
 */
export function parseConnectionString(connectionString: string): {
  protocol: ProtocolTypeLiteral | null;
  hostname: string;
  port?: number;
  username?: string;
  password?: string;
} | null {
  try {
    const url = new URL(connectionString);
    const protocol = url.protocol.replace(':', '') as ProtocolTypeLiteral;

    // Validate protocol
    if (!Object.keys(DEFAULT_PORTS).includes(protocol)) {
      return null;
    }

    // Handle IPv6 addresses - remove brackets
    const hostname = url.hostname.replace(/^\[|\]$/g, '');

    return {
      protocol,
      hostname,
      port: url.port ? parseInt(url.port, 10) : undefined,
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
    };
  } catch {
    return null;
  }
}
