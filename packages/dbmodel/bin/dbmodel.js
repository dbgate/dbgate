#!/usr/bin/env node

const path = require('path');
require('dotenv').config();

global.API_PACKAGE = path.dirname(path.dirname(require.resolve('dbgate-api')));
global.PLUGINS_DIR = process.env.DEVMODE
  ? path.join(path.dirname(path.dirname(global.API_PACKAGE)), 'plugins')
  : path.dirname(global.API_PACKAGE);
global.IS_NPM_DIST = true;
global.IS_DB_MODEL = true;

const program = require('commander');
const dbgateApi = require('dbgate-api');
const { createLogger } = require('pinomin');
const { extractErrorLogData } = require('dbgate-tools');

const logger = createLogger('dbmodel');

async function runAndExit(promise) {
  try {
    await promise;
    logger.info('Success');
    process.exit();
  } catch (err) {
    logger.error(extractErrorLogData(err), 'Processing failed');
    process.exit(1);
  }
}

program.version(dbgateApi.currentVersion.version);

program
  .option('-s, --server <server>', 'server host')
  .option('-u, --user <user>', 'user name')
  .option('-p, --password <password>', 'password')
  .option('-d, --database <database>', 'database name')
  .option('--auto-index-foreign-keys', 'automatically adds indexes to all foreign keys')
  .option(
    '--load-data-condition <condition>',
    'regex, which table data will be loaded and stored in model (in load command)'
  )
  .option('-e, --engine <engine>', 'engine name, eg. mysql@dbgate-plugin-mysql')
  .option('--commonjs', 'Creates CommonJS module');

program
  .command('deploy <modelFolder>')
  .description('Deploys model to database')
  .action(modelFolder => {
    const { engine, server, user, password, database } = program.opts();
    // const hooks = [];
    // if (program.autoIndexForeignKeys) hooks.push(dbmodel.hooks.autoIndexForeignKeys);

    runAndExit(
      dbgateApi.deployDb({
        connection: {
          engine,
          server,
          user,
          password,
          database,
        },
        modelFolder,
      })
    );
  });

//     runAndExit(
//       dbmodel.deploy({
//         connection: {
//           engine,
//           server,
//           user,
//           password,
//           database,
//         },
//         hooks,
//         projectDir,
//       })
//     );

program
  .command('load <outputDir>')
  .description('Loads model from database')
  .action(outputDir => {
    const { engine, server, user, password, database } = program.opts();
    // const loadDataCondition = program.loadDataCondition
    //   ? table => table.name.match(new RegExp(program.loadDataCondition, 'i'))
    //   : null;
    // const hooks = [];

    runAndExit(
      dbgateApi.loadDatabase({
        connection: {
          engine,
          server,
          user,
          password,
          database,
        },
        outputDir,
      })
    );
  });

program
  .command('build <modelFolder> <outputFile>')
  .description('Builds single SQL script from project')
  .action((modelFolder, outputFile) => {
    const { engine } = program.opts();
    // const hooks = [];
    runAndExit(
      dbgateApi.generateModelSql({
        // client,
        // hooks,
        modelFolder,
        outputFile,
        engine,
      })
    );
  });

program
  .command('json-to-model <jsonFile> <modelFolder>')
  .description('Converts JSON file to model')
  .action((jsonFile, modelFolder) => {
    runAndExit(
      dbgateApi.jsonToDbModel({
        modelFile: jsonFile,
        outputDir: modelFolder,
      })
    );
  });

program
  .command('model-to-json <modelFolder> <jsonFile>')
  .description('Converts model to JSON file')
  .action((modelFolder, jsonFile) => {
    const { commonjs } = program.opts();
    runAndExit(
      dbgateApi.dbModelToJson({
        modelFolder,
        outputFile: jsonFile,
        commonjs,
      })
    );
  });

program.parse(process.argv);
