const mssql = require('mssql');
const mysql = require('mysql');
const pg = require('pg');

const nativeModules = {
  mssql,
  mysql,
  pg,
};

function driverConnect(driver, connection) {
  return driver.connect(nativeModules, connection);
}

module.exports = driverConnect;
