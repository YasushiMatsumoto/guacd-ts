import { LogLevel, Logger as ILogger } from '../types';

/**
 * Default logger implementation
 */
export class Logger implements ILogger {
  constructor(
    private level: LogLevel = LogLevel.INFO,
    // eslint-disable-next-line no-console
    private stdLog: (message: string) => void = console.log,
    private errorLog: (message: string) => void = console.error
  ) {}

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Generic log method
   */
  log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (level <= this.level) {
      const timestamp = new Date().toISOString();
      const levelName = LogLevel[level];
      const formattedMessage = `[${timestamp}] [${levelName}] ${message}`;

      if (args.length > 0) {
        const argsString = args
          .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
          .join(' ');

        if (level === LogLevel.ERROR) {
          this.errorLog(`${formattedMessage} ${argsString}`);
        } else {
          this.stdLog(`${formattedMessage} ${argsString}`);
        }
      } else {
        if (level === LogLevel.ERROR) {
          this.errorLog(formattedMessage);
        } else {
          this.stdLog(formattedMessage);
        }
      }
    }
  }

  /**
   * Log error message
   */
  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * Log info message
   */
  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * Log debug message
   */
  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * Log verbose message
   */
  verbose(message: string, ...args: unknown[]): void {
    this.log(LogLevel.VERBOSE, message, ...args);
  }
}

/**
 * Create logger from options
 */
export function createLogger(options?: {
  level?: LogLevel | string;
  stdLog?: (message: string) => void;
  errorLog?: (message: string) => void;
}): Logger {
  let level = LogLevel.INFO;

  if (options?.level !== undefined) {
    if (typeof options.level === 'string') {
      const parsedLevel = LogLevel[options.level as keyof typeof LogLevel];
      if (parsedLevel !== undefined) {
        level = parsedLevel;
      }
    } else {
      level = options.level;
    }
  }

  return new Logger(level, options?.stdLog, options?.errorLog);
}
