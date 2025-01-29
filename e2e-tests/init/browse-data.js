const path = require('path');
const fs = require('fs');

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

async function initMongoDatabase(dbname, inputDirectory) {
  await dbgateApi.executeQuery({
    connection: {
      server: process.env.SERVER_mongo,
      user: process.env.USER_mongo,
      password: process.env.PASSWORD_mongo,
      port: process.env.PORT_mongo,
      database: dbname,
      engine: 'mongo@dbgate-plugin-mongo',
    },
    sql: 'db.dropDatabase()',
  });

  for (const file of fs.readdirSync(inputDirectory)) {
    const pureName = path.parse(file).name;
    const src = await dbgateApi.jsonLinesReader({ fileName: path.join(inputDirectory, file) });
    const dst = await dbgateApi.tableWriter({
      connection: {
        server: process.env.SERVER_mongo,
        user: process.env.USER_mongo,
        password: process.env.PASSWORD_mongo,
        port: process.env.PORT_mongo,
        database: dbname,
        engine: 'mongo@dbgate-plugin-mongo',
      },
      pureName,
      createIfNotExists: true,
    });
    await dbgateApi.copyStream(src, dst);
  }

  // await dbgateApi.importDatabase({
  //   connection: {
  //     server: process.env.SERVER_postgres,
  //     user: process.env.USER_postgres,
  //     password: process.env.PASSWORD_postgres,
  //     port: process.env.PORT_postgres,
  //     database: dbname,
  //     engine: 'postgres@dbgate-plugin-postgres',
  //   },
  //   inputFile,
  // });
}

async function initRedisDatabase(inputDirectory) {
  await dbgateApi.executeQuery({
    connection: {
      server: process.env.SERVER_redis,
      user: process.env.USER_redis,
      password: process.env.PASSWORD_redis,
      port: process.env.PORT_redis,
      engine: 'redis@dbgate-plugin-redis',
    },
    sql: 'FLUSHALL',
  });

  for (const file of fs.readdirSync(inputDirectory)) {
    await dbgateApi.executeQuery({
      connection: {
        server: process.env.SERVER_redis,
        user: process.env.USER_redis,
        password: process.env.PASSWORD_redis,
        port: process.env.PORT_redis,
        engine: 'redis@dbgate-plugin-redis',
        database: 0,
      },
      sqlFile: path.join(inputDirectory, file),
      // logScriptItems: true,
    });
  }

  // await dbgateApi.importDatabase({
  //   connection: {
  //     server: process.env.SERVER_postgres,
  //     user: process.env.USER_postgres,
  //     password: process.env.PASSWORD_postgres,
  //     port: process.env.PORT_postgres,
  //     database: dbname,
  //     engine: 'postgres@dbgate-plugin-postgres',
  //   },
  //   inputFile,
  // });
}

async function run() {
  await initMySqlDatabase('MyChinook', path.resolve(path.join(__dirname, '../data/chinook-mysql.sql')));
  // await initMySqlDatabase('Northwind', path.resolve(path.join(__dirname, '../data/northwind-mysql.sql')));
  // await initMySqlDatabase('Sakila', path.resolve(path.join(__dirname, '../data/sakila-mysql.sql')));

  await initPostgresDatabase('PgChinook', path.resolve(path.join(__dirname, '../data/chinook-postgres.sql')));

  await initMongoDatabase('MgChinook', path.resolve(path.join(__dirname, '../data/mongo')));

  await initRedisDatabase(path.resolve(path.join(__dirname, '../data/redis')));
}

dbgateApi.runScript(run);
