import { InstructionParts } from '../types';

/**
 * GuacamoleParser handles Guacamole protocol instructions parsing
 */
export class GuacamoleParser {
  oninstruction: ((opcode: string, params: string[]) => void) | null = null;

  // Holds partial data until a full instruction (ending with ;) is available
  private buffer = '';

  /**
   * Receive data from guacd and parse instructions
   */
  receive(data: string): void {
    this.buffer += data;
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
   * Parse a single Guacamole instruction
   */
  private parseInstruction(instruction: string): InstructionParts | null {
    const parts: string[] = [];
    let index = 0;

    while (index < instruction.length) {
      // Find length delimiter
      const lengthEnd = instruction.indexOf('.', index);
      if (lengthEnd === -1) return null;

      // Parse length
      const lengthStr = instruction.slice(index, lengthEnd);
      const length = parseInt(lengthStr, 10);
      if (isNaN(length)) return null;

      // Extract value
      const valueStart = lengthEnd + 1;
      const valueEnd = valueStart + length;
      if (valueEnd > instruction.length) return null;

      const value = instruction.slice(valueStart, valueEnd);
      parts.push(value);

      // Move index past value and delimiter
      index = valueEnd;

      // Instructions are separated by commas, last one ends with semicolon
      if (instruction[index] === ',') {
        index++; // Skip comma
      } else if (instruction[index] === ';') {
        break; // End of instruction
      } else {
        return null; // Invalid separator
      }
    }

    return parts as InstructionParts;
  }

  /**
   * Convert instruction array to string
   */
  static toInstruction(parts: string[]): string {
    return `${parts
      .map((part) => `${Buffer.byteLength(part, 'utf8')}.${part}`)
      .join(',')};`;
  }
}
