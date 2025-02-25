const path = require('path');
const localconfig = require('../.localconfig');

const dbgateApi = require('dbgate-api');
dbgateApi.initializeApiEnvironment();
const dbgatePluginMysql = require('dbgate-plugin-mysql');
dbgateApi.registerPlugins(dbgatePluginMysql);
const dbgatePluginPostgres = require('dbgate-plugin-postgres');
dbgateApi.registerPlugins(dbgatePluginPostgres);

async function createDb(connection, dropDbSql, createDbSql, database = 'my_guitar_shop') {
  if (dropDbSql) {
    try {
      await dbgateApi.executeQuery({
        connection,
        sql: dropDbSql,
      });
    } catch (err) {
      console.error('Failed to drop database', err);
    }
  }

  if (createDbSql) {
    await dbgateApi.executeQuery({
      connection,
      sql: createDbSql,
    });
  }

  await dbgateApi.importDbFromFolder({
    connection: {
      ...connection,
      database,
    },
    folder: path.resolve(path.join(__dirname, '../data/my-guitar-shop')),
  });
}

async function run() {
  if (localconfig.postgres) {
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
  }

  if (localconfig.mysql) {
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

  if (localconfig.mssql) {
    await createDb(
      {
        server: process.env.SERVER_mssql,
        user: process.env.USER_mssql,
        password: process.env.PASSWORD_mssql,
        port: process.env.PORT_mssql,
        engine: 'mssql@dbgate-plugin-mssql',
      },
      'drop database if exists my_guitar_shop',
      'create database my_guitar_shop'
    );
  }

  if (localconfig.oracle) {
    await createDb(
      {
        server: process.env.SERVER_oracle,
        user: process.env.USER_oracle,
        password: process.env.PASSWORD_oracle,
        port: process.env.PORT_oracle,
        engine: 'oracle@dbgate-plugin-oracle',
      },
      'DROP USER c##my_guitar_shop CASCADE',
      'CREATE USER c##my_guitar_shop IDENTIFIED BY my_guitar_shop DEFAULT TABLESPACE users TEMPORARY TABLESPACE temp QUOTA 10M ON users',
      'C##my_guitar_shop'
    );
  }

  if (localconfig.sqlite) {
    await createDb(
      {
        databaseFile: process.env.FILE_sqlite,
        singleDatabase: true,
        engine: 'sqlite@dbgate-plugin-sqlite',
      },
      null,
      null
    );
  }
}

dbgateApi.runScript(run);
