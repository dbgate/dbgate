const mssql = require('mssql');
const mysql = require('mysql');
const pg = require('pg');

function driverConnect(driver, connection) {
  const driverModules = {
    mssql,
    mysql,
    pg,
  };
  return driver.connect(driverModules, connection);
}

module.exports = driverConnect;
