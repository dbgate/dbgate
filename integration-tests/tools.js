global.DBGATE_TOOLS = require('dbgate-tools');
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

const testWrapper = body => async (label, engine, ...other) => {
  const driver = requireEngineDriver(engine.connection);
  const conn = await connect(engine, randomDbName());
  try {
    await body(conn, driver, engine, ...other);
  } finally {
    await driver.close(conn);
  }
};

module.exports = {
  randomDbName,
  connect,
  extractConnection,
  testWrapper,
};
