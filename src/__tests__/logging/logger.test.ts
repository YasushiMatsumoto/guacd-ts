import { Logger, createLogger } from '../../logging/logger';
import { LogLevel } from '../../types';

describe('Logger', () => {
  let stdLogMock: jest.Mock;
  let errorLogMock: jest.Mock;
  let logger: Logger;

  beforeEach(() => {
    stdLogMock = jest.fn();
    errorLogMock = jest.fn();
    logger = new Logger(LogLevel.VERBOSE, stdLogMock, errorLogMock);
  });

  describe('log levels', () => {
    it('should log error messages', () => {
      logger.error('Test error', 'extra');
      expect(errorLogMock).toHaveBeenCalledTimes(1);
      expect(errorLogMock.mock.calls[0][0]).toContain('[ERROR]');
      expect(errorLogMock.mock.calls[0][0]).toContain('Test error');
      expect(errorLogMock.mock.calls[0][0]).toContain('extra');
    });

    it('should log warn messages', () => {
      logger.warn('Test warning');
      expect(stdLogMock).toHaveBeenCalledTimes(1);
      expect(stdLogMock.mock.calls[0][0]).toContain('[WARN]');
      expect(stdLogMock.mock.calls[0][0]).toContain('Test warning');
    });

    it('should log info messages', () => {
      logger.info('Test info');
      expect(stdLogMock).toHaveBeenCalledTimes(1);
      expect(stdLogMock.mock.calls[0][0]).toContain('[INFO]');
    });

    it('should log debug messages', () => {
      logger.debug('Test debug');
      expect(stdLogMock).toHaveBeenCalledTimes(1);
      expect(stdLogMock.mock.calls[0][0]).toContain('[DEBUG]');
    });

    it('should log verbose messages', () => {
      logger.verbose('Test verbose');
      expect(stdLogMock).toHaveBeenCalledTimes(1);
      expect(stdLogMock.mock.calls[0][0]).toContain('[VERBOSE]');
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

  describe('createLogger', () => {
    it('should create logger with string level', () => {
      const logger = createLogger({ level: 'DEBUG' });
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with numeric level', () => {
      const logger = createLogger({ level: LogLevel.INFO });
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with default level', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(Logger);
    });
  });
});
