const path = require('path');
const fs = require('fs');

const dbgateApi = require('dbgate-api');
dbgateApi.initializeApiEnvironment();
const dbgatePluginRedis = require('dbgate-plugin-redis');
dbgateApi.registerPlugins(dbgatePluginRedis);

async function initRedisDatabase() {
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

  const files = [
    {
      file: path.resolve(__dirname, '../data/redis-db1.redis'),
      database: 0,
    },
    {
      file: path.resolve(__dirname, '../data/redis-db2.redis'),
      database: 1,
    },
  ];

  for (const { file, database } of files) {
    await dbgateApi.executeQuery({
      connection: {
        server: process.env.SERVER_redis,
        user: process.env.USER_redis,
        password: process.env.PASSWORD_redis,
        port: process.env.PORT_redis,
        engine: 'redis@dbgate-plugin-redis',
        database,
      },
      sqlFile: file,
    });
  }
}

async function run() {
  await initRedisDatabase();
}

dbgateApi.runScript(run);

module.exports = {
  initRedisDatabase,
};
