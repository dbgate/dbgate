const dbgateApi = require('dbgate-api');
dbgateApi.initializeApiEnvironment();
const dbgatePluginMysql = require('dbgate-plugin-mysql');
dbgateApi.registerPlugins(dbgatePluginMysql);

async function initStorageDatabase() {
  await dbgateApi.executeQuery({
    connection: {
      server: process.env.STORAGE_SERVER,
      user: process.env.STORAGE_USER,
      password: process.env.STORAGE_PASSWORD,
      port: process.env.STORAGE_PORT,
      engine: process.env.STORAGE_ENGINE,
    },
    sql: `drop database if exists ${process.env.STORAGE_DATABASE}`,
  });

  await dbgateApi.executeQuery({
    connection: {
      server: process.env.STORAGE_SERVER,
      user: process.env.STORAGE_USER,
      password: process.env.STORAGE_PASSWORD,
      port: process.env.STORAGE_PORT,
      engine: process.env.STORAGE_ENGINE,
    },
    sql: `create database ${process.env.STORAGE_DATABASE}`,
  });
}

async function run() {
  await initStorageDatabase();
}

dbgateApi.runScript(run);
