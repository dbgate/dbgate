const requireEngineDriver = require('dbgate-api/src/utility/requireEngineDriver');
const crypto = require('crypto');

function randomDbName() {
  const generatedKey = crypto.randomBytes(6);
  const newKey = generatedKey.toString('hex');
  return `db${newKey}`;
}

function extractConnection(engine) {
  const { connection } = engine;

  if (process.env.LOCALTEST && engine.local) {
    return {
      ...connection,
      ...engine.local,
    };
  }

  return connection;
}

async function connect(engine, database) {
  const connection = extractConnection(engine);
  const driver = requireEngineDriver(connection);

  if (engine.generateDbFile) {
    const conn = await driver.connect({
      ...connection,
      databaseFile: `dbtemp/${database}`,
    });
    return conn;
  } else {
    const conn = await driver.connect(connection);
    await driver.query(conn, `CREATE DATABASE ${database}`);
    await driver.close(conn);

    const res = await driver.connect({
      ...connection,
      database,
    });
    return res;
  }
}

async function prepareConnection(engine, database) {
  const connection = extractConnection(engine);
  const driver = requireEngineDriver(connection);

  if (engine.generateDbFile) {
    return {
      ...connection,
      databaseFile: `dbtemp/${database}`,
      isPreparedOnly: true,
    };
  } else {
    const conn = await driver.connect(connection);
    await driver.query(conn, `CREATE DATABASE ${database}`);
    await driver.close(conn);

    return {
      ...connection,
      database,
      isPreparedOnly: true,
    };
  }
}

const testWrapper =
  body =>
  async (label, ...other) => {
    const engine = other[other.length - 1];
    const driver = requireEngineDriver(engine.connection);
    const conn = await connect(engine, randomDbName());
    try {
      await body(conn, driver, ...other);
    } finally {
      await driver.close(conn);
    }
  };

const testWrapperPrepareOnly =
  body =>
  async (label, ...other) => {
    const engine = other[other.length - 1];
    const driver = requireEngineDriver(engine.connection);
    const conn = await prepareConnection(engine, randomDbName());
    await body(conn, driver, ...other);
  };

module.exports = {
  randomDbName,
  connect,
  extractConnection,
  testWrapper,
  testWrapperPrepareOnly,
};
