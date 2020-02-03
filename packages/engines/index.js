const _ = require("lodash");
const mssql = require('./mssql');
const mysql = require('./mysql');
const postgres = require('./postgres');

const drivers = {
  mssql,
  mysql,
  postgres,
}

/** @return {import('@dbgate/types').EngineDriver} */
function getDriver(connection) {
  if (_.isString(connection)) {
    return drivers[connection];
  }
  if (_.isPlainObject(connection)) {
    const { engine } = connection;
    if (engine) {
      return drivers[engine];
    }
  }
  throw new Error(`Cannot extract engine from ${connection}`)
}
module.exports = getDriver;
