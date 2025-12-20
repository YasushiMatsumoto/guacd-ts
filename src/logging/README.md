# Logging Module

Module providing logging functionality.

## File Structure

- **logger.ts** - Logger implementation and log level management

## Log Levels

0. **ERROR** - Error messages only
1. **WARN** - Warnings and above
2. **INFO** - Informational messages and above
3. **DEBUG** - Debug information and above
4. **VERBOSE** - All messages

## Usage Example

```typescript
import { createLogger, LogLevel } from './logging/logger';

const logger = createLogger({
  level: LogLevel.DEBUG,
  stdLog: console.log,
  errorLog: console.error,
});

logger.info('Server started');
logger.debug('Connection details', { host: '127.0.0.1', port: 4822 });
logger.error('Connection failed', error);
```

## Custom Logger

Custom log output destinations can be configured:

```typescript
const logger = createLogger({
  level: 'INFO',
  stdLog: (msg) => fs.appendFileSync('app.log', msg + '\n'),
  errorLog: (msg) => fs.appendFileSync('error.log', msg + '\n'),
});
```
