const path = require('path');

const dbgateApi = require('dbgate-api');
dbgateApi.initializeApiEnvironment();
const dbgatePluginMysql = require('dbgate-plugin-mysql');
dbgateApi.registerPlugins(dbgatePluginMysql);
const dbgatePluginPostgres = require('dbgate-plugin-postgres');
dbgateApi.registerPlugins(dbgatePluginPostgres);

async function createDb(connection, dropDbSql, createDbSql) {
  await dbgateApi.executeQuery({
    connection,
    sql: dropDbSql,
  });

  await dbgateApi.executeQuery({
    connection,
    sql: createDbSql,
  });

  await dbgateApi.importDbFromFolder({
    connection: {
      ...connection,
      database: 'my_guitar_shop',
    },
    folder: path.resolve(path.join(__dirname, '../data/my-guitar-shop')),
  });
}

async function run() {
  await createDb(
    {
      server: process.env.SERVER_postgres,
      user: process.env.USER_postgres,
      password: process.env.PASSWORD_postgres,
      port: process.env.PORT_postgres,
      engine: 'postgres@dbgate-plugin-postgres',
    },
    'drop database if exists my_guitar_shop',
    'create database my_guitar_shop'
  );

  await createDb(
    {
      server: process.env.SERVER_mysql,
      user: process.env.USER_mysql,
      password: process.env.PASSWORD_mysql,
      port: process.env.PORT_mysql,
      engine: 'mysql@dbgate-plugin-mysql',
    },
    'drop database if exists my_guitar_shop',
    'create database my_guitar_shop'
  );
}

dbgateApi.runScript(run);
