const path = require('path');
const dbgateApi = require('dbgate-api');
dbgateApi.initializeApiEnvironment();
const dbgatePluginMysql = require('dbgate-plugin-mysql');
dbgateApi.registerPlugins(dbgatePluginMysql);
const dbgatePluginPostgres = require('dbgate-plugin-postgres');
dbgateApi.registerPlugins(dbgatePluginPostgres);

async function initMySqlDatabase(dbname, inputFile) {
  await dbgateApi.executeQuery({
    connection: {
      server: process.env.SERVER_mysql,
      user: process.env.USER_mysql,
      password: process.env.PASSWORD_mysql,
      port: process.env.PORT_mysql,
      engine: 'mysql@dbgate-plugin-mysql',
    },
    sql: `drop database if exists ${dbname}`,
  });

  await dbgateApi.executeQuery({
    connection: {
      server: process.env.SERVER_mysql,
      user: process.env.USER_mysql,
      password: process.env.PASSWORD_mysql,
      port: process.env.PORT_mysql,
      engine: 'mysql@dbgate-plugin-mysql',
    },
    sql: `create database ${dbname}`,
  });

  await dbgateApi.importDatabase({
    connection: {
      server: process.env.SERVER_mysql,
      user: process.env.USER_mysql,
      password: process.env.PASSWORD_mysql,
      port: process.env.PORT_mysql,
      database: dbname,
      engine: 'mysql@dbgate-plugin-mysql',
    },
    inputFile,
  });
}

async function initPostgresDatabase(dbname, inputFile) {
  await dbgateApi.executeQuery({
    connection: {
      server: process.env.SERVER_postgres,
      user: process.env.USER_postgres,
      password: process.env.PASSWORD_postgres,
      port: process.env.PORT_postgres,
      engine: 'postgres@dbgate-plugin-postgres',
    },
    sql: `drop database if exists "${dbname}"`,
  });

  await dbgateApi.executeQuery({
    connection: {
      server: process.env.SERVER_postgres,
      user: process.env.USER_postgres,
      password: process.env.PASSWORD_postgres,
      port: process.env.PORT_postgres,
      engine: 'postgres@dbgate-plugin-postgres',
    },
    sql: `create database "${dbname}"`,
  });

  await dbgateApi.importDatabase({
    connection: {
      server: process.env.SERVER_postgres,
      user: process.env.USER_postgres,
      password: process.env.PASSWORD_postgres,
      port: process.env.PORT_postgres,
      database: dbname,
      engine: 'postgres@dbgate-plugin-postgres',
    },
    inputFile,
  });
}

async function run() {
  await initMySqlDatabase('MyChinook', path.resolve(path.join(__dirname, '../data/Chinook-mysql.sql')));
  // await initMySqlDatabase('Northwind', path.resolve(path.join(__dirname, '../data/northwind-mysql.sql')));
  // await initMySqlDatabase('Sakila', path.resolve(path.join(__dirname, '../data/sakila-mysql.sql')));

  await initPostgresDatabase('PgChinook', path.resolve(path.join(__dirname, '../data/Chinook-postgres.sql')));
}

dbgateApi.runScript(run);
