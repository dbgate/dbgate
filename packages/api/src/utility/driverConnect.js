const mssql = require('mssql');
const mysql = require('mysql');
const pg = require('pg');
const fs = require('fs-extra');
const path = require('path');

const nativeModules = {
  mssql,
  mysql,
  pg,
  fs,
  path,
};

function driverConnect(driver, connection) {
  return driver.connect(nativeModules, connection);
}

module.exports = driverConnect;
