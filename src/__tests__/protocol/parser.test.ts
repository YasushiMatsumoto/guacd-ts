import { GuacamoleParser } from '../../protocol/parser';

describe('GuacamoleParser', () => {
  let parser: GuacamoleParser;
  let receivedInstructions: Array<{ opcode: string; params: string[] }>;

  beforeEach(() => {
    parser = new GuacamoleParser();
    receivedInstructions = [];
    parser.oninstruction = (opcode, params): void => {
      receivedInstructions.push({ opcode, params });
    };
  });

  describe('receive', () => {
    it('should parse simple instruction', () => {
      parser.receive('3.nop;');

      expect(receivedInstructions).toHaveLength(1);
      expect(receivedInstructions[0]).toEqual({
        opcode: 'nop',
        params: [],
      });
    });

    it('should parse instruction with parameters', () => {
      parser.receive('4.size,4.1024,3.768;');

      expect(receivedInstructions).toHaveLength(1);
      expect(receivedInstructions[0]).toEqual({
        opcode: 'size',
        params: ['1024', '768'],
      });
    });

    it('should parse multiple instructions', () => {
      parser.receive('3.nop;4.sync,10.1234567890;');

      expect(receivedInstructions).toHaveLength(2);
      expect(receivedInstructions[0]).toEqual({ opcode: 'nop', params: [] });
      expect(receivedInstructions[1]).toEqual({ opcode: 'sync', params: ['1234567890'] });
    });

    it('should handle partial instructions', () => {
      parser.receive('4.size,4.');
      expect(receivedInstructions).toHaveLength(0);

      parser.receive('1024,3.768;');
      expect(receivedInstructions).toHaveLength(1);
      expect(receivedInstructions[0]).toEqual({
        opcode: 'size',
        params: ['1024', '768'],
      });
    });

    it('should parse ready instruction with connection ID', () => {
      parser.receive('5.ready,37.$b447679c-0541-4b3d-821b-74389e9dfb16;');

      expect(receivedInstructions).toHaveLength(1);
      expect(receivedInstructions[0]).toEqual({
        opcode: 'ready',
        params: ['$b447679c-0541-4b3d-821b-74389e9dfb16'],
      });
    });
  });

  describe('toInstruction', () => {
    it('should format simple instruction', () => {
      const result = GuacamoleParser.toInstruction(['nop']);
      expect(result).toBe('3.nop;');
    });

    it('should format instruction with parameters', () => {
      const result = GuacamoleParser.toInstruction(['size', '1024', '768']);
      expect(result).toBe('4.size,4.1024,3.768;');
    });

    it('should handle empty opcode', () => {
      const result = GuacamoleParser.toInstruction(['', 'connection-id']);
      expect(result).toBe('0.,13.connection-id;');
    });

    it('should handle multibyte characters correctly', () => {
      const result = GuacamoleParser.toInstruction(['text', 'こんにちは']);
      // 'こんにちは' is 15 bytes in UTF-8
      expect(result).toBe('4.text,15.こんにちは;');
    });
  });
});
