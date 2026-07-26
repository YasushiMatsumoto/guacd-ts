import {
  GuacamoleError,
  GuacamoleErrorCode,
  GUACAMOLE_STATUS_CODE,
  ConnectionError,
  ConnectionTimeoutError,
  ConnectionResetError,
  HandshakeError,
  InactivityTimeoutError,
  TicketNotFoundError,
  TicketExpiredError,
  TicketAlreadyUsedError,
  AuthenticationError,
  InvalidSessionError,
  ServiceUnavailableError,
  ServiceNotFoundError,
  ValidationError,
} from '../../errors';

describe('GuacamoleErrorCode', () => {
  it('should have unique values for all codes', () => {
    const values = Object.values(GuacamoleErrorCode);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('GUACAMOLE_STATUS_CODE', () => {
  it('should have a mapping for every GuacamoleErrorCode', () => {
    for (const code of Object.values(GuacamoleErrorCode)) {
      expect(GUACAMOLE_STATUS_CODE[code]).toBeDefined();
    }
  });

  it('should map to expected numeric status codes', () => {
    expect(GUACAMOLE_STATUS_CODE[GuacamoleErrorCode.CONNECTION_ERROR]).toBe(512);
    expect(GUACAMOLE_STATUS_CODE[GuacamoleErrorCode.SERVICE_UNAVAILABLE]).toBe(520);
    expect(GUACAMOLE_STATUS_CODE[GuacamoleErrorCode.AUTHENTICATION_FAILED]).toBe(771);
    expect(GUACAMOLE_STATUS_CODE[GuacamoleErrorCode.VALIDATION_ERROR]).toBe(768);
    expect(GUACAMOLE_STATUS_CODE[GuacamoleErrorCode.TICKET_NOT_FOUND]).toBe(769);
    expect(GUACAMOLE_STATUS_CODE[GuacamoleErrorCode.INACTIVITY_TIMEOUT]).toBe(522);
  });
});

describe('GuacamoleError', () => {
  it('should set name, message, and code', () => {
    const err = new GuacamoleError('test', GuacamoleErrorCode.CONNECTION_ERROR);
    expect(err.name).toBe('GuacamoleError');
    expect(err.message).toBe('test');
    expect(err.code).toBe(GuacamoleErrorCode.CONNECTION_ERROR);
  });

  it('should be instanceof Error', () => {
    const err = new GuacamoleError('test', GuacamoleErrorCode.CONNECTION_ERROR);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(GuacamoleError);
  });

  it('should store cause when provided', () => {
    const cause = new Error('root');
    const err = new GuacamoleError('test', GuacamoleErrorCode.CONNECTION_ERROR, cause);
    expect(err.cause).toBe(cause);
  });

  it('should have undefined cause when not provided', () => {
    const err = new GuacamoleError('test', GuacamoleErrorCode.CONNECTION_ERROR);
    expect(err.cause).toBeUndefined();
  });
});

describe('ConnectionError', () => {
  it('should set correct name and code', () => {
    const err = new ConnectionError('failed');
    expect(err.name).toBe('ConnectionError');
    expect(err.code).toBe(GuacamoleErrorCode.CONNECTION_ERROR);
    expect(err.message).toBe('failed');
  });

  it('should be instanceof GuacamoleError and Error', () => {
    const err = new ConnectionError('failed');
    expect(err).toBeInstanceOf(ConnectionError);
    expect(err).toBeInstanceOf(GuacamoleError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should store cause', () => {
    const cause = new Error('root');
    const err = new ConnectionError('failed', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('ConnectionTimeoutError', () => {
  it('should store host, port, and timeoutMs', () => {
    const err = new ConnectionTimeoutError('10.0.0.1', 4822, 5000);
    expect(err.host).toBe('10.0.0.1');
    expect(err.port).toBe(4822);
    expect(err.timeoutMs).toBe(5000);
  });

  it('should format message with host, port, and timeout', () => {
    const err = new ConnectionTimeoutError('10.0.0.1', 4822, 5000);
    expect(err.message).toBe('Connection to guacd at 10.0.0.1:4822 timed out after 5000ms');
  });

  it('should set correct name and code', () => {
    const err = new ConnectionTimeoutError('10.0.0.1', 4822, 5000);
    expect(err.name).toBe('ConnectionTimeoutError');
    expect(err.code).toBe(GuacamoleErrorCode.CONNECTION_TIMEOUT);
  });

  it('should be instanceof GuacamoleError', () => {
    const err = new ConnectionTimeoutError('10.0.0.1', 4822, 5000);
    expect(err).toBeInstanceOf(ConnectionTimeoutError);
    expect(err).toBeInstanceOf(GuacamoleError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('ConnectionResetError', () => {
  it('should store host and port', () => {
    const err = new ConnectionResetError('10.0.0.1', 4822);
    expect(err.host).toBe('10.0.0.1');
    expect(err.port).toBe(4822);
  });

  it('should format message with host and port', () => {
    const err = new ConnectionResetError('10.0.0.1', 4822);
    expect(err.message).toBe('Connection to guacd at 10.0.0.1:4822 was reset');
  });

  it('should set correct name and code', () => {
    const err = new ConnectionResetError('10.0.0.1', 4822);
    expect(err.name).toBe('ConnectionResetError');
    expect(err.code).toBe(GuacamoleErrorCode.CONNECTION_RESET);
  });
});

describe('HandshakeError', () => {
  it('should set correct name and code', () => {
    const err = new HandshakeError('handshake failed');
    expect(err.name).toBe('HandshakeError');
    expect(err.code).toBe(GuacamoleErrorCode.HANDSHAKE_ERROR);
    expect(err.message).toBe('handshake failed');
  });

  it('should be instanceof GuacamoleError', () => {
    const err = new HandshakeError('fail');
    expect(err).toBeInstanceOf(HandshakeError);
    expect(err).toBeInstanceOf(GuacamoleError);
  });
});

describe('InactivityTimeoutError', () => {
  it('should store idleMs', () => {
    const err = new InactivityTimeoutError(30000);
    expect(err.idleMs).toBe(30000);
  });

  it('should format message with idleMs', () => {
    const err = new InactivityTimeoutError(30000);
    expect(err.message).toBe('Session terminated due to inactivity (30000ms)');
  });

  it('should set correct name and code', () => {
    const err = new InactivityTimeoutError(30000);
    expect(err.name).toBe('InactivityTimeoutError');
    expect(err.code).toBe(GuacamoleErrorCode.INACTIVITY_TIMEOUT);
  });
});

describe('TicketNotFoundError', () => {
  it('should store ticketId', () => {
    const err = new TicketNotFoundError('abc-123');
    expect(err.ticketId).toBe('abc-123');
  });

  it('should format message with ticketId', () => {
    const err = new TicketNotFoundError('abc-123');
    expect(err.message).toBe('Ticket not found: abc-123');
  });

  it('should set correct name and code', () => {
    const err = new TicketNotFoundError('abc-123');
    expect(err.name).toBe('TicketNotFoundError');
    expect(err.code).toBe(GuacamoleErrorCode.TICKET_NOT_FOUND);
  });

  it('should be instanceof GuacamoleError', () => {
    const err = new TicketNotFoundError('abc-123');
    expect(err).toBeInstanceOf(TicketNotFoundError);
    expect(err).toBeInstanceOf(GuacamoleError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('TicketExpiredError', () => {
  it('should store ticketId and expiredAt', () => {
    const err = new TicketExpiredError('abc-123', '2024-01-01T00:00:00.000Z');
    expect(err.ticketId).toBe('abc-123');
    expect(err.expiredAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should format message with ticketId and expiredAt', () => {
    const err = new TicketExpiredError('abc-123', '2024-01-01T00:00:00.000Z');
    expect(err.message).toBe('Ticket expired: abc-123 (expired at 2024-01-01T00:00:00.000Z)');
  });

  it('should set correct name and code', () => {
    const err = new TicketExpiredError('abc-123', '2024-01-01T00:00:00.000Z');
    expect(err.name).toBe('TicketExpiredError');
    expect(err.code).toBe(GuacamoleErrorCode.TICKET_EXPIRED);
  });
});

describe('TicketAlreadyUsedError', () => {
  it('should store ticketId', () => {
    const err = new TicketAlreadyUsedError('abc-123');
    expect(err.ticketId).toBe('abc-123');
  });

  it('should format message with ticketId', () => {
    const err = new TicketAlreadyUsedError('abc-123');
    expect(err.message).toBe('Ticket already used: abc-123');
  });

  it('should set correct name and code', () => {
    const err = new TicketAlreadyUsedError('abc-123');
    expect(err.name).toBe('TicketAlreadyUsedError');
    expect(err.code).toBe(GuacamoleErrorCode.TICKET_ALREADY_USED);
  });
});

describe('AuthenticationError', () => {
  it('should store reason', () => {
    const err = new AuthenticationError('invalid credentials');
    expect(err.reason).toBe('invalid credentials');
  });

  it('should format message with reason', () => {
    const err = new AuthenticationError('invalid credentials');
    expect(err.message).toBe('Authentication failed: invalid credentials');
  });

  it('should set correct name and code', () => {
    const err = new AuthenticationError('invalid credentials');
    expect(err.name).toBe('AuthenticationError');
    expect(err.code).toBe(GuacamoleErrorCode.AUTHENTICATION_FAILED);
  });

  it('should be instanceof GuacamoleError', () => {
    const err = new AuthenticationError('reason');
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err).toBeInstanceOf(GuacamoleError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('InvalidSessionError', () => {
  it('should set correct name and code', () => {
    const err = new InvalidSessionError('bad data');
    expect(err.name).toBe('InvalidSessionError');
    expect(err.code).toBe(GuacamoleErrorCode.INVALID_SESSION);
    expect(err.message).toBe('bad data');
  });

  it('should be instanceof GuacamoleError', () => {
    const err = new InvalidSessionError('bad data');
    expect(err).toBeInstanceOf(InvalidSessionError);
    expect(err).toBeInstanceOf(GuacamoleError);
  });
});

describe('ServiceUnavailableError', () => {
  it('should store host and port', () => {
    const err = new ServiceUnavailableError('10.0.0.1', 4822);
    expect(err.host).toBe('10.0.0.1');
    expect(err.port).toBe(4822);
  });

  it('should format message with host and port', () => {
    const err = new ServiceUnavailableError('10.0.0.1', 4822);
    expect(err.message).toBe('guacd service unavailable at 10.0.0.1:4822');
  });

  it('should set correct name and code', () => {
    const err = new ServiceUnavailableError('10.0.0.1', 4822);
    expect(err.name).toBe('ServiceUnavailableError');
    expect(err.code).toBe(GuacamoleErrorCode.SERVICE_UNAVAILABLE);
  });
});

describe('ServiceNotFoundError', () => {
  it('should store host', () => {
    const err = new ServiceNotFoundError('unknown-host');
    expect(err.host).toBe('unknown-host');
  });

  it('should format message with host', () => {
    const err = new ServiceNotFoundError('unknown-host');
    expect(err.message).toBe('guacd host not found: unknown-host');
  });

  it('should set correct name and code', () => {
    const err = new ServiceNotFoundError('unknown-host');
    expect(err.name).toBe('ServiceNotFoundError');
    expect(err.code).toBe(GuacamoleErrorCode.SERVICE_NOT_FOUND);
  });
});

describe('ValidationError', () => {
  it('should store field, value, and constraint', () => {
    const err = new ValidationError('port', 99999, 'must be between 1 and 65535');
    expect(err.field).toBe('port');
    expect(err.value).toBe(99999);
    expect(err.constraint).toBe('must be between 1 and 65535');
  });

  it('should format message with field and constraint', () => {
    const err = new ValidationError('port', 99999, 'must be between 1 and 65535');
    expect(err.message).toBe('Validation failed for "port": must be between 1 and 65535');
  });

  it('should set correct name and code', () => {
    const err = new ValidationError('port', 99999, 'must be between 1 and 65535');
    expect(err.name).toBe('ValidationError');
    expect(err.code).toBe(GuacamoleErrorCode.VALIDATION_ERROR);
  });

  it('should be instanceof GuacamoleError', () => {
    const err = new ValidationError('port', 99999, 'must be between 1 and 65535');
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toBeInstanceOf(GuacamoleError);
    expect(err).toBeInstanceOf(Error);
  });
});
