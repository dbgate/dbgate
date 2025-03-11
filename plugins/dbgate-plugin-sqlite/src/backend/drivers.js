//R@ts-check
const sqliteDriver = require('./driver.sqlite');
const libsqlDriver = require('./driver.libsql');

const drivers = [sqliteDriver, libsqlDriver];

drivers.initialize = (dbgateEnv) => {};

module.exports = drivers;
