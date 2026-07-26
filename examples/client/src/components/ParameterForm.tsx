import type { CSSProperties } from 'react';
import type { ProtocolSchema, FieldSpec, FieldType } from '../schemas/index';

type Settings = Record<string, string>;

interface Props {
  schema: ProtocolSchema;
  settings: Settings;
  onChange: (settings: Settings) => void;
}

const label: CSSProperties = {
  display: 'block',
  fontSize: 11,
  color: '#aaa',
  marginBottom: 2,
};

const input: CSSProperties = {
  width: '100%',
  background: '#2a2a2a',
  border: '1px solid #444',
  borderRadius: 4,
  color: '#e0e0e0',
  fontSize: 12,
  padding: '4px 6px',
};

const checkbox: CSSProperties = {
  accentColor: '#60a5fa',
  width: 14,
  height: 14,
};

const sectionHeader: CSSProperties = {
  cursor: 'pointer',
  padding: '6px 10px',
  background: '#252525',
  borderBottom: '1px solid #333',
  fontSize: 12,
  fontWeight: 600,
  color: '#ccc',
  userSelect: 'none',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

function coerce(value: string, type: FieldType): string | number | boolean | undefined {
  if (value === '') return undefined;
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === 'true';
  return value;
}

function FieldInput({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: string;
  onChange: (key: string, val: string) => void;
}) {
  const handleChange = (val: string) => onChange(spec.key, val);

  if (spec.type === 'boolean') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          style={checkbox}
          checked={value === 'true'}
          onChange={(e) => handleChange(e.target.checked ? 'true' : '')}
        />
        <span style={{ fontSize: 12, color: '#ccc' }}>{spec.label}</span>
      </div>
    );
  }

  if (spec.type === 'select' && spec.options) {
    return (
      <>
        <span style={label}>{spec.label}</span>
        <select
          style={{ ...input, cursor: 'pointer' }}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
        >
          {spec.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </>
    );
  }

  if (spec.type === 'textarea') {
    return (
      <>
        <span style={label}>{spec.label}</span>
        <textarea
          style={{ ...input, height: 80, resize: 'vertical', fontFamily: 'monospace' }}
          value={value}
          placeholder={spec.placeholder}
          onChange={(e) => handleChange(e.target.value)}
        />
      </>
    );
  }

  return (
    <>
      <span style={label}>
        {spec.label}
        {spec.required && <span style={{ color: '#f87171' }}> *</span>}
      </span>
      <input
        style={input}
        type={spec.type === 'password' ? 'password' : spec.type === 'number' ? 'number' : 'text'}
        value={value}
        placeholder={spec.placeholder ?? (spec.default !== undefined ? String(spec.default) : undefined)}
        onChange={(e) => handleChange(e.target.value)}
      />
    </>
  );
}

export function ParameterForm({ schema, settings, onChange }: Props) {
  const handleFieldChange = (key: string, rawValue: string) => {
    onChange({ ...settings, [key]: rawValue });
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {schema.sections.map((section) => (
        <details key={section.title} open={section.defaultOpen ?? false}>
          <summary style={sectionHeader}>
            <span>{section.title}</span>
          </summary>
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {section.fields.map((field) => (
              <div key={field.key}>
                <FieldInput
                  spec={field}
                  value={settings[field.key] ?? ''}
                  onChange={handleFieldChange}
                />
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export function buildSettings(settings: Settings, schema: ProtocolSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      const raw = settings[field.key];
      if (raw === undefined || raw === '') continue;
      const coerced = coerce(raw, field.type);
      if (coerced !== undefined) result[field.key] = coerced;
    }
  }
  return result;
}
