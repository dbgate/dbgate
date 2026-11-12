const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

function loadDriver() {
  let options;
  const mocks = {
    lodash: {},
    stream: require('node:stream'),
    '../frontend/driver': { defaultLocalDataCenter: 'datacenter1' },
    './Analyser': class {},
    'cassandra-driver': {
      Client: class {
        constructor(clientOptions) {
          options = clientOptions;
        }
        connect() {
          return Promise.resolve();
        }
      },
    },
    './createBulkInsertStream.js': () => {},
    'dbgate-tools': {},
  };
  const filename = path.join(__dirname, 'driver.js');
  const sandbox = {
    module: { exports: {} },
    require(name) {
      assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`);
      return mocks[name];
    },
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  return { driver: sandbox.module.exports, getOptions: () => options };
}

test('connect forwards the configured CA and TLS options to Cassandra', async () => {
  const { driver, getOptions } = loadDriver();
  const ssl = { ca: [Buffer.from('test CA certificate')], rejectUnauthorized: true };
  await driver.connect({ server: 'db.example', database: 'app', ssl });
  assert.strictEqual(getOptions().sslOptions, ssl);
});

test('connect leaves TLS disabled when SSL is not configured', async () => {
  const { driver, getOptions } = loadDriver();
  await driver.connect({ server: 'db.example', database: 'app' });
  assert.strictEqual(getOptions().sslOptions, undefined);
});
