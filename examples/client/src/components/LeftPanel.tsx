import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ProtocolSchema } from '../schemas/index';
import { rdpSchema, vncSchema, sshSchema, telnetSchema } from '../schemas/index';
import { ParameterForm, buildSettings } from './ParameterForm';
import { ValidationBanner } from './ValidationBanner';
import type { ValidateResponse, ConnectionInfo, ConnectionsResponse, StatsResponse } from '../types/api';
import type { GuacStatus } from '../hooks/useGuacamole';

type Protocol = 'rdp' | 'vnc' | 'ssh' | 'telnet';
type Tab = Protocol | 'sessions';

const SCHEMAS: Record<Protocol, ProtocolSchema> = {
  rdp: rdpSchema,
  vnc: vncSchema,
  ssh: sshSchema,
  telnet: telnetSchema,
};

const TABS: Tab[] = ['rdp', 'vnc', 'ssh', 'telnet', 'sessions'];

// These hostnames/ports are from guacd's perspective (inside Docker network).
// guacd reaches protocol containers via their Docker service names, not host-exposed ports.
const DEFAULT_SETTINGS: Record<Protocol, Record<string, string>> = {
  rdp:    { hostname: 'rdp',    port: '3389', username: 'rdpuser',    password: 'rdppass',    security: 'any', 'ignore-cert': 'true' },
  vnc:    { hostname: 'vnc',    port: '5900', username: 'vncuser', password: 'vncpass' },
  ssh:    { hostname: 'console', port: '22',   username: 'sshuser',    password: 'sshpass' },
  telnet: { hostname: 'console', port: '23',   username: 'telnetuser', password: 'telnetpass' },
};

interface Props {
  status: GuacStatus;
  remoteClipboard: string;
  onConnect: (wsUrl: string) => void;
  onDisconnect: () => void;
  onSendClipboard: (text: string) => void;
}

const tabStyle = (active: boolean): CSSProperties => ({
  padding: '8px 14px',
  background: active ? '#1e40af' : '#252525',
  color: active ? '#fff' : '#aaa',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: active ? 700 : 400,
  borderBottom: active ? '2px solid #60a5fa' : '2px solid transparent',
});

const btnStyle = (variant: 'primary' | 'danger' | 'secondary'): CSSProperties => ({
  padding: '7px 14px',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  background: variant === 'primary' ? '#1d4ed8' : variant === 'danger' ? '#b91c1c' : '#374151',
  color: '#fff',
});

const statusDot = (status: GuacStatus): CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  background:
    status === 'connected' ? '#4ade80' :
    status === 'error' ? '#f87171' :
    status === 'connecting' || status === 'disconnecting' ? '#fbbf24' :
    '#555',
  display: 'inline-block',
  marginRight: 5,
});

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${String(s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${String(m)}m ${String(s % 60)}s`;
  const h = Math.floor(m / 60);
  return `${String(h)}h ${String(m % 60)}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function LeftPanel({ status, remoteClipboard, onConnect, onDisconnect, onSendClipboard }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('rdp');
  const [protocol, setProtocol] = useState<Protocol>('rdp');
  const [settingsMap, setSettingsMap] = useState<Record<Protocol, Record<string, string>>>(DEFAULT_SETTINGS);
  const [validation, setValidation] = useState<ValidateResponse | null>(null);
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [allowJoin, setAllowJoin] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSettings = settingsMap[protocol];
  const schema = SCHEMAS[protocol];

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab !== 'sessions') {
      setProtocol(tab);
    }
  };

  const handleSettingsChange = useCallback(
    (newSettings: Record<string, string>) => {
      setSettingsMap((prev) => ({ ...prev, [protocol]: newSettings }));
    },
    [protocol]
  );

  // Debounced validation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const settings = buildSettings(settingsMap[protocol], schema);
      fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol, settings }),
      })
        .then((r) => r.json() as Promise<ValidateResponse>)
        .then(setValidation)
        .catch(() => setValidation(null));
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [protocol, settingsMap, schema]);

  // Poll active connections and stats every 3 seconds
  useEffect(() => {
    const fetchData = () => {
      fetch('/api/connections')
        .then((r) => r.json() as Promise<ConnectionsResponse>)
        .then((data) => setConnections(data.connections))
        .catch(() => setConnections([]));
      fetch('/api/stats')
        .then((r) => r.json() as Promise<StatsResponse>)
        .then(setStats)
        .catch(() => setStats(null));
    };
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    const settings = buildSettings(currentSettings, schema);
    try {
      const res = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol, settings, allowJoin }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { errors?: string[]; error?: string };
        const msgs = body.errors ?? [body.error ?? 'Unknown error'];
        setValidation({ valid: false, errors: msgs, warnings: [] });
        return;
      }
      const data = (await res.json()) as { wsUrl: string; warnings: string[] };
      if (data.warnings?.length) {
        setValidation({ valid: true, errors: [], warnings: data.warnings });
      }
      onConnect(data.wsUrl);
    } catch (e) {
      setValidation({ valid: false, errors: [e instanceof Error ? e.message : 'Request failed'], warnings: [] });
    }
  };

  const handleJoin = async (connectionId: string) => {
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setValidation({ valid: false, errors: [body.error ?? 'Failed to join'], warnings: [] });
        return;
      }
      const data = (await res.json()) as { wsUrl: string };
      onConnect(data.wsUrl);
    } catch (e) {
      setValidation({ valid: false, errors: [e instanceof Error ? e.message : 'Join failed'], warnings: [] });
    }
  };

  const isConnected = status === 'connected';
  const isBusy = status === 'connecting' || status === 'disconnecting';

  return (
    <div
      style={{
        width: 380,
        minWidth: 320,
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #333',
        background: '#1a1a1a',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
        {TABS.map((t) => (
          <button key={t} style={tabStyle(t === activeTab)} onClick={() => handleTabChange(t)}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {activeTab === 'sessions' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {/* Active Sessions */}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', marginBottom: 8 }}>
            Active Sessions ({connections.length})
          </div>
          {connections.length === 0 ? (
            <div style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>No active sessions</div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              {connections.map((conn) => (
                <div
                  key={conn.connectionId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    marginBottom: 4,
                    background: '#252525',
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      background: '#1e40af',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {conn.protocol}
                  </span>
                  <span style={{ color: '#ccc' }}>#{conn.connectionId.slice(0, 8)}</span>
                  <span style={{ color: '#666', marginLeft: 'auto' }}>
                    {formatDuration(conn.stats.durationMs)}
                  </span>
                  <button
                    style={{
                      ...btnStyle('secondary'),
                      padding: '3px 10px',
                      fontSize: 11,
                      opacity: conn.allowJoin ? 1 : 0.4,
                    }}
                    disabled={isBusy || !conn.allowJoin}
                    onClick={() => void handleJoin(conn.connectionId)}
                    title={conn.allowJoin ? 'Join this session' : 'Joining not allowed'}
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Server Stats */}
          <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', marginBottom: 8 }}>
            Server Stats
          </div>
          {stats ? (
            <div
              style={{
                background: '#252525',
                borderRadius: 4,
                padding: '10px 12px',
                fontSize: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Active Connections</span>
                <span style={{ color: '#e0e0e0', fontWeight: 600 }}>{stats.activeConnections}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Uptime</span>
                <span style={{ color: '#e0e0e0' }}>{formatDuration(stats.uptime * 1000)}</span>
              </div>
              <div
                style={{
                  borderTop: '1px solid #333',
                  marginTop: 4,
                  paddingTop: 6,
                  fontSize: 11,
                  color: '#666',
                }}
              >
                Memory
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>RSS</span>
                <span style={{ color: '#e0e0e0' }}>{formatBytes(stats.memory.rss)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Heap Used</span>
                <span style={{ color: '#e0e0e0' }}>{formatBytes(stats.memory.heapUsed)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>Heap Total</span>
                <span style={{ color: '#e0e0e0' }}>{formatBytes(stats.memory.heapTotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#888' }}>External</span>
                <span style={{ color: '#e0e0e0' }}>{formatBytes(stats.memory.external)}</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#555' }}>Loading...</div>
          )}
        </div>
      ) : (
        <>
          {/* Parameter form */}
          <ParameterForm schema={schema} settings={currentSettings} onChange={handleSettingsChange} />

          {/* Validation banner */}
          <ValidationBanner result={validation} />

          {/* Action buttons + status */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              style={btnStyle('primary')}
              disabled={isBusy || (validation !== null && !validation.valid)}
              onClick={() => void handleConnect()}
            >
              {isConnected ? 'Reconnect' : 'Connect'}
            </button>
            <button
              style={btnStyle('danger')}
              disabled={!isConnected && !isBusy}
              onClick={onDisconnect}
            >
              Disconnect
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#888', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allowJoin}
                onChange={(e) => setAllowJoin(e.target.checked)}
                style={{ accentColor: '#1d4ed8' }}
              />
              Allow Join
            </label>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888', display: 'flex', alignItems: 'center' }}>
              <span style={statusDot(status)} />
              {status}
            </span>
          </div>

          {/* Clipboard — Copy / Paste (visible when connected) */}
          {isConnected && (
            <div style={{ borderTop: '1px solid #333', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Copy (Remote → Local) */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>COPY</div>
                <div
                  style={{
                    background: '#252525',
                    borderRadius: 4,
                    padding: '6px 8px',
                    fontSize: 12,
                    color: remoteClipboard ? '#ccc' : '#555',
                    minHeight: 32,
                    maxHeight: 80,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    marginBottom: 6,
                  }}
                >
                  {remoteClipboard || 'No clipboard data from remote'}
                </div>
                <button
                  style={{ ...btnStyle('secondary'), width: '100%', fontSize: 11 }}
                  disabled={!remoteClipboard}
                  onClick={() => {
                    void navigator.clipboard.writeText(remoteClipboard).then(() => {
                      setCopyFeedback(true);
                      setTimeout(() => setCopyFeedback(false), 1500);
                    });
                  }}
                >
                  {copyFeedback ? 'Copied!' : 'Copy to local clipboard'}
                </button>
              </div>

              {/* Paste (Local → Remote) */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 6 }}>PASTE</div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Type or paste text here..."
                  style={{
                    width: '100%',
                    background: '#252525',
                    border: '1px solid #333',
                    borderRadius: 4,
                    padding: '6px 8px',
                    fontSize: 12,
                    color: '#ccc',
                    resize: 'vertical',
                    minHeight: 48,
                    maxHeight: 120,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <button
                    style={{ ...btnStyle('secondary'), flex: 1, fontSize: 11 }}
                    onClick={() => {
                      void navigator.clipboard.readText().then((text) => {
                        setPasteText(text);
                      });
                    }}
                  >
                    Read local clipboard
                  </button>
                  <button
                    style={{ ...btnStyle('primary'), flex: 1, fontSize: 11 }}
                    disabled={!pasteText}
                    onClick={() => {
                      onSendClipboard(pasteText);
                      setPasteText('');
                    }}
                  >
                    Send to remote
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
