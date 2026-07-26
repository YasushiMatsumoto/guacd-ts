import type { CSSProperties } from 'react';
import type { GuacStatus } from '../hooks/useGuacamole';

interface Props {
  displayRef: (el: HTMLDivElement | null) => void;
  status: GuacStatus;
  error: string | null;
}

const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: 8,
  color: '#888',
  fontSize: 14,
  pointerEvents: 'none',
};

export function RightPanel({ displayRef, status, error }: Props) {
  const showOverlay = status !== 'connected';

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      <div
        ref={displayRef}
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      />
      {showOverlay && (
        <div style={overlay}>
          {error ? (
            <>
              <span style={{ fontSize: 32 }}>⚠</span>
              <span style={{ color: '#f87171', maxWidth: 400, textAlign: 'center' }}>{error}</span>
            </>
          ) : status === 'connecting' ? (
            <>
              <span style={{ fontSize: 32 }}>⌛</span>
              <span>Connecting…</span>
            </>
          ) : status === 'disconnecting' ? (
            <>
              <span style={{ fontSize: 32 }}>↓</span>
              <span>Disconnecting…</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 48, opacity: 0.3 }}>🖥</span>
              <span>Select a protocol and click Connect</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
