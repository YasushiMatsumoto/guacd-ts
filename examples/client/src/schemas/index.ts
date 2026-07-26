export type FieldType = 'string' | 'password' | 'number' | 'boolean' | 'select' | 'textarea';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  options?: SelectOption[];
  default?: string | number | boolean;
  required?: boolean;
  placeholder?: string;
}

export interface SectionSpec {
  title: string;
  defaultOpen?: boolean;
  fields: FieldSpec[];
}

export interface ProtocolSchema {
  protocol: 'rdp' | 'vnc' | 'ssh' | 'telnet';
  sections: SectionSpec[];
}

export { rdpSchema } from './rdp';
export { vncSchema } from './vnc';
export { sshSchema } from './ssh';
export { telnetSchema } from './telnet';
