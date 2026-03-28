/**
 * Logging module for guacd-ts.
 *
 * Provides a minimal {@link ILogger} interface that external loggers
 * (winston, pino, bunyan, …) can satisfy, plus a lightweight
 * {@link DefaultLogger} for projects that do not need a dedicated
 * logging library.
 *
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Log level
// ---------------------------------------------------------------------------

/**
 * Numeric log levels ordered by increasing verbosity.
 *
 * | Level   | Value | Usage                          |
 * |---------|-------|--------------------------------|
 * | ERROR   | 0     | Fatal / unrecoverable failures |
 * | WARN    | 1     | Recoverable problems           |
 * | INFO    | 2     | Operational milestones         |
 * | DEBUG   | 3     | Troubleshooting detail         |
 * | VERBOSE | 4     | Wire-level / high-frequency    |
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4,
}

// ---------------------------------------------------------------------------
// ILogger interface
// ---------------------------------------------------------------------------

/**
 * Minimal logger contract that guacd-ts relies on.
 *
 * Any object that satisfies this interface can be passed as the `logger`
 * option when creating a {@link GuacamoleServer}.  Popular loggers like
 * **winston** or **pino** can be wrapped trivially.
 *
 * @example
 * ```ts
 * // Using the built-in DefaultLogger
 * const logger = new DefaultLogger(LogLevel.DEBUG);
 *
 * // Wrapping pino
 * import pino from 'pino';
 * const pinoLogger = pino();
 * const logger: ILogger = {
 *   error: (m, ctx) => pinoLogger.error(ctx ?? {}, m),
 *   warn:  (m, ctx) => pinoLogger.warn(ctx ?? {}, m),
 *   info:  (m, ctx) => pinoLogger.info(ctx ?? {}, m),
 *   debug: (m, ctx) => pinoLogger.debug(ctx ?? {}, m),
 *   verbose: (m, ctx) => pinoLogger.trace(ctx ?? {}, m),
 * };
 * ```
 */
export interface ILogger {
  /** Log an error-level message. */
  error(message: string, context?: Record<string, unknown>): void;
  /** Log a warning-level message. */
  warn(message: string, context?: Record<string, unknown>): void;
  /** Log an informational message. */
  info(message: string, context?: Record<string, unknown>): void;
  /** Log a debug-level message. */
  debug(message: string, context?: Record<string, unknown>): void;
  /** Log a verbose / trace-level message. */
  verbose(message: string, context?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// DefaultLogger
// ---------------------------------------------------------------------------

/**
 * Lightweight console logger shipped with the library.
 *
 * Messages below the configured {@link LogLevel} are silently discarded.
 * Output goes to `stdout` (info / debug / verbose / warn) and `stderr`
 * (error) by default, but both sinks can be replaced.
 *
 * @example
 * ```ts
 * const logger = new DefaultLogger(LogLevel.DEBUG);
 * logger.info('Server started', { port: 3000 });
 * // => [2025-03-28T12:00:00.000Z] [INFO] Server started {"port":3000}
 * ```
 */
export class DefaultLogger implements ILogger {
  /**
   * @param level    - Minimum level to emit (default: {@link LogLevel.INFO}).
   * @param stdLog   - Sink for non-error messages (default: `console.log`).
   * @param errorLog - Sink for error messages (default: `console.error`).
   */
  constructor(
    private level: LogLevel = LogLevel.INFO,
    // eslint-disable-next-line no-console
    private stdLog: (message: string) => void = console.log,
    private errorLog: (message: string) => void = console.error
  ) {}

  /** Change the minimum log level at runtime. */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /** @inheritdoc */
  error(message: string, context?: Record<string, unknown>): void {
    this.write(LogLevel.ERROR, message, context);
  }

  /** @inheritdoc */
  warn(message: string, context?: Record<string, unknown>): void {
    this.write(LogLevel.WARN, message, context);
  }

  /** @inheritdoc */
  info(message: string, context?: Record<string, unknown>): void {
    this.write(LogLevel.INFO, message, context);
  }

  /** @inheritdoc */
  debug(message: string, context?: Record<string, unknown>): void {
    this.write(LogLevel.DEBUG, message, context);
  }

  /** @inheritdoc */
  verbose(message: string, context?: Record<string, unknown>): void {
    this.write(LogLevel.VERBOSE, message, context);
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level > this.level) return;

    const ts = new Date().toISOString();
    const tag = LogLevel[level];
    const suffix = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
    const line = `[${ts}] [${tag}] ${message}${suffix}`;

    if (level === LogLevel.ERROR) {
      this.errorLog(line);
    } else {
      this.stdLog(line);
    }
  }
}

// ---------------------------------------------------------------------------
// Factory helper
// ---------------------------------------------------------------------------

/** Options accepted by {@link createDefaultLogger}. */
export interface DefaultLoggerOptions {
  /**
   * Minimum level to emit.  Accepts a {@link LogLevel} enum value **or**
   * a case-insensitive string such as `"DEBUG"`.  Defaults to `INFO`.
   */
  level?: LogLevel | string;
  /** Override the default stdout sink. */
  stdLog?: (message: string) => void;
  /** Override the default stderr sink. */
  errorLog?: (message: string) => void;
}

/**
 * Create a {@link DefaultLogger} from a plain-object options bag.
 *
 * @param options - Logger configuration.
 * @returns A configured {@link DefaultLogger} instance.
 */
export function createDefaultLogger(options?: DefaultLoggerOptions): DefaultLogger {
  let level = LogLevel.INFO;

  if (options?.level !== undefined) {
    if (typeof options.level === 'string') {
      const upper = options.level.toUpperCase() as keyof typeof LogLevel;
      const parsed = LogLevel[upper];
      if (parsed !== undefined) {
        level = parsed;
      }
    } else {
      level = options.level;
    }
  }

  return new DefaultLogger(level, options?.stdLog, options?.errorLog);
}
