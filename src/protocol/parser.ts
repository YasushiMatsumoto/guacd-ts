/**
 * Guacamole protocol parser
 * Based on the official Apache Guacamole parser implementation
 */
export class GuacamoleParser {
  private buffer = '';
  public oninstruction: ((opcode: string, params: string[]) => void) | null = null;

  /**
   * Receive data and parse instructions
   */
  receive(data: string): void {
    this.buffer += data;

    while (this.buffer.length > 0) {
      const instructionEnd = this.buffer.indexOf(';');
      if (instructionEnd === -1) {
        break; // Incomplete instruction
      }

      const instructionString = this.buffer.substring(0, instructionEnd);
      this.buffer = this.buffer.substring(instructionEnd + 1);

      const instruction = this.parseInstruction(instructionString);
      if (instruction && this.oninstruction) {
        const [opcode, ...params] = instruction;
        this.oninstruction(opcode, params);
      }
    }
  }

  /**
   * Parse a single instruction string
   */
  private parseInstruction(instruction: string): string[] | null {
    const elements: string[] = [];
    let elementStart = 0;

    while (elementStart < instruction.length) {
      // Find the length delimiter (period)
      const lengthEnd = instruction.indexOf('.', elementStart);
      if (lengthEnd === -1) {
        return null; // Malformed instruction
      }

      // Parse length
      const lengthStr = instruction.substring(elementStart, lengthEnd);
      const length = parseInt(lengthStr, 10);

      if (isNaN(length)) {
        return null; // Invalid length
      }

      // Extract element
      const elementEnd = lengthEnd + 1 + length;
      if (elementEnd > instruction.length) {
        return null; // Incomplete element
      }

      const element = instruction.substring(lengthEnd + 1, elementEnd);
      elements.push(element);

      // Move to next element
      elementStart = elementEnd;

      // Check for comma separator (except after last element)
      if (elementStart < instruction.length) {
        if (instruction[elementStart] !== ',') {
          return null; // Missing comma
        }
        elementStart++; // Skip comma
      }
    }

    return elements;
  }

  /**
   * Format instruction parts into protocol string
   */
  static toInstruction(parts: string[]): string {
    const formatted = parts.map((part) => {
      const length = Buffer.byteLength(part, 'utf8');
      return `${length}.${part}`;
    });

    return formatted.join(',') + ';';
  }
}
