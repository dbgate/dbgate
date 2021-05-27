global.DBGATE_TOOLS = require('dbgate-tools');
const requireEngineDriver = require('dbgate-api/src/utility/requireEngineDriver');
const crypto = require('crypto');

function randomDbName() {
  const generatedKey = crypto.randomBytes(6);
  const newKey = generatedKey.toString('hex');
  return `db${newKey}`;
}

async function connect(engine, database) {
  const { connection } = engine;
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

module.exports = {
  randomDbName,
  connect,
};
