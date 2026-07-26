export interface TicketResponse {
  ticketId: string;
  wsUrl: string;
  expiresAt: string;
  warnings: string[];
}

export interface ValidateResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConnectionInfo {
  connectionId: string;
  guacamoleConnectionId: string;
  protocol: string;
  allowJoin: boolean;
  metadata?: Record<string, unknown>;
  stats: {
    connectedAt: string;
    durationMs: number;
    bytesReceived: number;
    bytesSent: number;
  };
}

export interface ConnectionsResponse {
  connections: ConnectionInfo[];
}

export interface StatsResponse {
  activeConnections: number;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}
