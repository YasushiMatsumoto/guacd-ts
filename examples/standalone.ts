/**
 * Simple standalone server example (CLI)
 * Run with: ts-node examples/standalone.ts
 */
import { GuacdServer } from '../src';

const server = new GuacdServer(
  {
    port: 8080,
  },
  {
    host: '127.0.0.1',
    port: 4822,
  },
  {
    // crypt is optional when using session IDs; kept for legacy token compatibility
    crypt: {
      cypher: 'AES-256-CBC',
      key: 'MySuperSecretKeyForParamsToken12',
    },
    log: {
      level: 'INFO',
    },
  }
);

server.on('open', (connection) => {
  console.log(`Connection opened: ${connection.connectionId}`);
});

server.on('close', (connection, error) => {
  if (error) {
    console.error(`Connection closed with error: ${error.message}`);
  } else {
    console.log(`Connection closed: ${connection.connectionId}`);
  }
});

(async () => {
  console.log('GuacdServer started on ws://localhost:8080');
  console.log('\nExample session issuance:');

  const sessionId = await server.issueSession({
    type: 'rdp',
    settings: {
      hostname: '192.168.1.100',
      username: 'Administrator',
      password: 'YourPassword',
      port: 3389,
      'ignore-cert': true,
    },
  });

  console.log(`ws://localhost:8080/?sessionId=${encodeURIComponent(sessionId)}`);
})();
