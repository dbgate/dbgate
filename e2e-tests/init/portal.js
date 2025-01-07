const dbgateApi = require('dbgate-api');
dbgateApi.initializeApiEnvironment();
const dbgatePluginMysql = require('dbgate-plugin-mysql');
dbgateApi.registerPlugins(dbgatePluginMysql);
const dbgatePluginPostgres = require('dbgate-plugin-postgres');
dbgateApi.registerPlugins(dbgatePluginPostgres);

async function run() {
    await dbgateApi.executeQuery({
      connection: {
        server: process.env.SERVER_mysql,
        user: process.env.USER_mysql,
        password: process.env.PASSWORD_mysql,
        port: process.env.PORT_mysql,
        engine: 'mysql@dbgate-plugin-mysql',
      },
      sql: 'drop database if exists Chinook',
    });

  await dbgateApi.executeQuery({
    connection: {
      server: process.env.SERVER_postgres,
      user: process.env.USER_postgres,
      password: process.env.PASSWORD_postgres,
      port: process.env.PORT_postgres,
      engine: 'postgres@dbgate-plugin-postgres',
    },
    sql: 'drop database if exists "Chinook"',
  });
}

dbgateApi.runScript(run);
