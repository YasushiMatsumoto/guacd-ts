import type { CSSProperties } from 'react';
import type { ValidateResponse } from '../types/api';

interface Props {
  result: ValidateResponse | null;
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '8px 12px',
    fontSize: 12,
    borderTop: '1px solid #333',
  },
  error: {
    color: '#f87171',
    marginBottom: 2,
  },
  warning: {
    color: '#fbbf24',
    marginBottom: 2,
  },
  ok: {
    color: '#4ade80',
  },
};

export function ValidationBanner({ result }: Props) {
  if (!result) return null;

  if (result.valid && result.warnings.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.ok}>✓ Settings look good</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {result.errors.map((e, i) => (
        <div key={i} style={styles.error}>✗ {e}</div>
      ))}
      {result.warnings.map((w, i) => (
        <div key={i} style={styles.warning}>⚠ {w}</div>
      ))}
    </div>
  );
}
