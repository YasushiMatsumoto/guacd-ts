import { DefaultLogger, LogLevel, createDefaultLogger } from '../../logging/logger';

describe('DefaultLogger', () => {
  let stdLogMock: jest.Mock;
  let errorLogMock: jest.Mock;
  let logger: DefaultLogger;

  beforeEach(() => {
    stdLogMock = jest.fn();
    errorLogMock = jest.fn();
    logger = new DefaultLogger(LogLevel.VERBOSE, stdLogMock, errorLogMock);
  });

  describe('log levels', () => {
    it('should log error messages', () => {
      logger.error('Test error');
      expect(errorLogMock).toHaveBeenCalledTimes(1);
      expect(errorLogMock).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
      expect(errorLogMock).toHaveBeenCalledWith(expect.stringContaining('Test error'));
    });

    it('should log error messages with context', () => {
      logger.error('Test error', { extra: 'info' });
      expect(errorLogMock).toHaveBeenCalledTimes(1);
      expect(errorLogMock).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
      expect(errorLogMock).toHaveBeenCalledWith(expect.stringContaining('Test error'));
      expect(errorLogMock).toHaveBeenCalledWith(expect.stringContaining('"extra":"info"'));
    });

    it('should log warn messages', () => {
      logger.warn('Test warning');
      expect(stdLogMock).toHaveBeenCalledTimes(1);
      expect(stdLogMock).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
      expect(stdLogMock).toHaveBeenCalledWith(expect.stringContaining('Test warning'));
    });

    it('should log info messages', () => {
      logger.info('Test info');
      expect(stdLogMock).toHaveBeenCalledTimes(1);
      expect(stdLogMock).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
    });

    it('should log debug messages', () => {
      logger.debug('Test debug');
      expect(stdLogMock).toHaveBeenCalledTimes(1);
      expect(stdLogMock).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
    });

    it('should log verbose messages', () => {
      logger.verbose('Test verbose');
      expect(stdLogMock).toHaveBeenCalledTimes(1);
      expect(stdLogMock).toHaveBeenCalledWith(expect.stringContaining('[VERBOSE]'));
    });
  });

  describe('log level filtering', () => {
    it('should not log messages above current level', () => {
      logger.setLevel(LogLevel.WARN);
      logger.info('Should not log');
      logger.debug('Should not log');
      logger.verbose('Should not log');

      expect(stdLogMock).not.toHaveBeenCalled();
      expect(errorLogMock).not.toHaveBeenCalled();
    });

    it('should log messages at or below current level', () => {
      logger.setLevel(LogLevel.WARN);
      logger.error('Should log');
      logger.warn('Should log');

      expect(errorLogMock).toHaveBeenCalledTimes(1);
      expect(stdLogMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('createDefaultLogger', () => {
    it('should create logger with string level', () => {
      const created = createDefaultLogger({ level: 'DEBUG' });
      expect(created).toBeInstanceOf(DefaultLogger);
    });

    it('should create logger with numeric level', () => {
      const created = createDefaultLogger({ level: LogLevel.INFO });
      expect(created).toBeInstanceOf(DefaultLogger);
    });

    it('should create logger with default level', () => {
      const created = createDefaultLogger();
      expect(created).toBeInstanceOf(DefaultLogger);
    });
  });
});
