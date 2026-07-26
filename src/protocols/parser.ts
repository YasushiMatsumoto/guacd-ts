import { InstructionParts } from '../types';

/**
 * GuacamoleParser handles Guacamole protocol instructions parsing
 */
export class GuacamoleParser {
  private static readonly MAX_BUFFER_BYTES = 10 * 1024 * 1024;

  oninstruction: ((opcode: string, params: string[]) => void) | null = null;
  onerror: ((error: Error) => void) | null = null;

  private buffer = '';

  /**
   * Receive data from guacd and parse instructions
   */
  receive(data: string): void {
    this.buffer += data;

    if (Buffer.byteLength(this.buffer, 'utf8') > GuacamoleParser.MAX_BUFFER_BYTES) {
      const error = new Error('Guacamole parser buffer overflow');
      this.buffer = '';
      if (this.onerror) {
        this.onerror(error);
      }
      return;
    }

    let instructionEnd;

    while ((instructionEnd = this.buffer.indexOf(';')) !== -1) {
      const instruction = this.buffer.slice(0, instructionEnd + 1);
      this.buffer = this.buffer.slice(instructionEnd + 1);

      const parts = this.parseInstruction(instruction);
      if (parts && this.oninstruction) {
        const [opcode, ...params] = parts;
        this.oninstruction(opcode, params);
      }
    }
  }

  /**
   * Parse a single Guacamole instruction using byte-based lengths.
   */
  private parseInstruction(instruction: string): InstructionParts | null {
    const buf = Buffer.from(instruction, 'utf8');
    const parts: string[] = [];
    let index = 0;

    while (index < buf.length) {
      const dotIndex = buf.indexOf(0x2e, index); // '.'
      if (dotIndex === -1) return null;

      const lengthStr = buf.subarray(index, dotIndex).toString('utf8');
      const length = parseInt(lengthStr, 10);
      if (isNaN(length) || length < 0) return null;

      const valueStart = dotIndex + 1;
      const valueEnd = valueStart + length;
      if (valueEnd > buf.length) return null;

      const value = buf.subarray(valueStart, valueEnd).toString('utf8');
      parts.push(value);

      index = valueEnd;

      if (buf[index] === 0x2c) { // ','
        index++;
      } else if (buf[index] === 0x3b) { // ';'
        break;
      } else {
        return null;
      }
    }

    if (parts.length === 0) return null;
    return parts as InstructionParts;
  }

  /**
   * Convert instruction array to string
   */
  static toInstruction(parts: string[]): string {
    return `${parts.map((part) => `${Buffer.byteLength(part, 'utf8')}.${part}`).join(',')};`;
  }
}
