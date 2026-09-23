// Regression tests for driver.operation().
//
// These DDL operations used to be carried out by building MongoDB shell source with the
// collection names interpolated into it and evaluating it with script(), which runs a direct
// eval - so the evaluated text had the backend module's own scope, including require, in reach.
//
//   POST /database-connections/run-operation
//   { "operation": { "type": "createCollection",
//                    "collection": { "name": "x'); require('child_process').execSync('...'); ('" } } }
//
// gave arbitrary code execution on the DbGate server. That route only checks connection
// permission, so read access to one MongoDB connection was enough.

// The frontend half of the driver reaches for dbgate-tools through this global, which the
// plugin loader normally provides (see webpack externals / PluginsProvider). Set it up before
// requiring the driver.
global.DBGATE_PACKAGES = { 'dbgate-tools': require('dbgate-tools') };

const drivers = require('./drivers');

const driver = drivers.find(x => x.engine == 'mongo@dbgate-plugin-mongo') ?? drivers[0];

// a collection name that breaks out of the single-quoted string the old code built
const INJECTION = "x'); global.__dbgate_pwned = true; ('";

function createFakeDbhan() {
  const aggregateResult = { toArray: jest.fn(async () => []) };
  const collection = { aggregate: jest.fn(() => aggregateResult) };
  const db = {
    createCollection: jest.fn(async () => ({})),
    dropCollection: jest.fn(async () => true),
    renameCollection: jest.fn(async () => ({})),
    collection: jest.fn(() => collection),
    listCollections: jest.fn(() => ({ toArray: jest.fn(async () => []) })),
  };
  return { dbhan: { getDatabase: () => db }, db, collection, aggregateResult };
}

describe('mongo driver operation()', () => {
  beforeEach(() => {
    delete global.__dbgate_pwned;
  });

  test('createCollection passes the name as a value, not as script text', async () => {
    const { dbhan, db } = createFakeDbhan();

    await driver.operation(dbhan, { type: 'createCollection', collection: { name: 'orders' } }, {});

    expect(db.createCollection).toHaveBeenCalledWith('orders');
  });

  test('dropCollection passes the name as a value', async () => {
    const { dbhan, db } = createFakeDbhan();

    await driver.operation(dbhan, { type: 'dropCollection', collection: 'orders' }, {});

    expect(db.dropCollection).toHaveBeenCalledWith('orders');
  });

  test('renameCollection passes both names as values', async () => {
    const { dbhan, db } = createFakeDbhan();

    await driver.operation(dbhan, { type: 'renameCollection', collection: 'orders', newName: 'invoices' }, {});

    expect(db.renameCollection).toHaveBeenCalledWith('orders', 'invoices');
  });

  test('cloneCollection passes both names as values', async () => {
    const { dbhan, db, collection, aggregateResult } = createFakeDbhan();

    await driver.operation(dbhan, { type: 'cloneCollection', collection: 'orders', newName: 'invoices' }, {});

    expect(db.collection).toHaveBeenCalledWith('orders');
    expect(collection.aggregate).toHaveBeenCalledWith([{ $out: 'invoices' }]);
    expect(aggregateResult.toArray).toHaveBeenCalled();
  });

  describe('a collection name cannot execute code', () => {
    test.each([
      ['createCollection', { type: 'createCollection', collection: { name: INJECTION } }],
      ['dropCollection', { type: 'dropCollection', collection: INJECTION }],
      ['renameCollection source', { type: 'renameCollection', collection: INJECTION, newName: 'x' }],
      ['renameCollection target', { type: 'renameCollection', collection: 'x', newName: INJECTION }],
      ['cloneCollection source', { type: 'cloneCollection', collection: INJECTION, newName: 'x' }],
      ['cloneCollection target', { type: 'cloneCollection', collection: 'x', newName: INJECTION }],
    ])('%s', async (_label, operation) => {
      const { dbhan } = createFakeDbhan();

      // the name is now data: it is handed to the driver verbatim (and MongoDB rejects it),
      // never parsed as JavaScript
      await driver.operation(dbhan, operation, {}).catch(() => {});

      expect(global.__dbgate_pwned).toBeUndefined();
    });
  });

  describe('invalid collection names are refused with a clear error', () => {
    test.each([[undefined], [null], [''], [42], [{}], [['x']], ['with\0null']])('%p', async name => {
      const { dbhan, db } = createFakeDbhan();

      await expect(driver.operation(dbhan, { type: 'dropCollection', collection: name }, {})).rejects.toThrow(
        /Invalid collection name/
      );
      expect(db.dropCollection).not.toHaveBeenCalled();
    });
  });

  test('an unknown operation type is refused', async () => {
    const { dbhan } = createFakeDbhan();
    await expect(driver.operation(dbhan, { type: 'evalScript' }, {})).rejects.toThrow(/not supported/);
  });
});
