// @ts-check
const requireEngineDriver = require('dbgate-api/src/utility/requireEngineDriver');
const crypto = require('crypto');

function randomDbName(dialect) {
  const generatedKey = crypto.randomBytes(6);
  const newKey = generatedKey.toString('hex');
  const res = `db${newKey}`;
  if (dialect.upperCaseAllDbObjectNames) return res.toUpperCase();
  return res;
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
    const dmp = driver.createDumper();
    dmp.createDatabase(database);
    await driver.query(conn, dmp.s);
    await driver.close(conn);

    const res = await driver.connect({
      ...connection,
      database: (driver.dialect.userDatabaseNamePrefix ?? '') + database,
    });
    return res;
  }
}

async function prepareConnection(engine, database) {
  const { connection } = engine;
  const driver = requireEngineDriver(connection);

  if (engine.generateDbFile) {
    return {
      ...connection,
      databaseFile: `dbtemp/${database}`,
      isPreparedOnly: true,
    };
  } else {
    const conn = await driver.connect(connection);
    const dmp = driver.createDumper();
    dmp.createDatabase(database);
    await driver.query(conn, dmp.s);
    await driver.close(conn);

    return {
      ...connection,
      database: (driver.dialect.userDatabaseNamePrefix ?? '') + database,
      isPreparedOnly: true,
    };
  }
}

const testWrapper =
  body =>
  async (label, ...other) => {
    const engine = other[other.length - 1];
    const driver = requireEngineDriver(engine.connection);
    const conn = await connect(engine, randomDbName(driver.dialect));
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
    const conn = await prepareConnection(engine, randomDbName(driver.dialect));
    await body(conn, driver, ...other);
  };

/** @param {string} sql
 * @returns {string} */
const removeNotNull = sql => sql.replace(/not null/gi, '');

/** @param {import('dbgate-types').TestEngineInfo} engine
 * @param {string} sql
 * @returns {string} */
const transformSqlForEngine = (engine, sql) => {
  let result = sql;

  if (engine.removeNotNull) {
    result = removeNotNull(result);
  }

  return result;
};

module.exports = {
  randomDbName,
  connect,
  testWrapper,
  testWrapperPrepareOnly,
  transformSqlForEngine,
};
