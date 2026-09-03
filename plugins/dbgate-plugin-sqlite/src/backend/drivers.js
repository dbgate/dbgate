//R@ts-check
const sqliteDriver = require('./driver.sqlite');
const libsqlDriver = require('./driver.libsql');
const cloudflareD1Driver = require('./driver.d1');

const drivers = [sqliteDriver, libsqlDriver, cloudflareD1Driver];

drivers.initialize = (dbgateEnv) => {};

module.exports = drivers;
