const path = require('path');
const os = require('os');
const fs = require('fs');

const baseDir = path.join(os.homedir(), '.dbgate');

const dbgateApi = require('dbgate-api');
dbgateApi.initializeApiEnvironment();
const dbgatePluginMysql = require('dbgate-plugin-mysql');
dbgateApi.registerPlugins(dbgatePluginMysql);

async function copyFolder(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  for (const file of fs.readdirSync(source)) {
    fs.copyFileSync(path.join(source, file), path.join(target, file));
  }
}

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

async function run() {
  const connection = {
    server: process.env.SERVER_mysql,
    user: process.env.USER_mysql,
    password: process.env.PASSWORD_mysql,
    port: process.env.PORT_mysql,
    engine: 'mysql@dbgate-plugin-mysql',
  };

  try {
    await dbgateApi.executeQuery({
      connection,
      sql: 'drop database if exists charts_sample',
    });
  } catch (err) {
    console.error('Failed to drop database', err);
  }

  await dbgateApi.executeQuery({
    connection,
    sql: 'create database charts_sample',
  });

  await dbgateApi.importDbFromFolder({
    connection: {
      ...connection,
      database: 'charts_sample',
    },
    folder: path.resolve(path.join(__dirname, '../data/charts-sample')),
  });

  await copyFolder(
    path.resolve(path.join(__dirname, '../data/files/sql')),
    path.join(baseDir, 'files-e2etests', 'sql')
  );

  await copyFolder(
    path.resolve(path.join(__dirname, '../data/files/themes')),
    path.join(baseDir, 'files-e2etests', 'themes')
  );

  await initMySqlDatabase('MyChinook', path.resolve(path.join(__dirname, '../data/chinook-mysql.sql')));
}

dbgateApi.runScript(run);
