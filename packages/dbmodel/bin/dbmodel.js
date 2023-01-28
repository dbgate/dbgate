#!/usr/bin/env node

const path = require('path');
require('dotenv').config();

global.API_PACKAGE = path.dirname(path.dirname(require.resolve('dbgate-api')));
global.PLUGINS_DIR = process.env.DEVMODE
  ? path.join(path.dirname(path.dirname(global.API_PACKAGE)), 'plugins')
  : path.dirname(global.API_PACKAGE);
global.IS_NPM_DIST = true;

const program = require('commander');
const dbmodel = require('../lib');
const dbgateApi = require('dbgate-api');

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
  .requiredOption('-e, --engine <engine>', 'engine name, eg. mysql@dbgate-plugin-mysql');

program
  .command('deploy <projectDir>')
  .description('Deploys model to database')
  .action(projectDir => {
    const { engine, server, user, password, database } = program;
    const hooks = [];
    if (program.autoIndexForeignKeys) hooks.push(dbmodel.hooks.autoIndexForeignKeys);
    dbmodel.runAndExit(
      dbmodel.deploy({
        connection: {
          engine,
          server,
          user,
          password,
          database,
        },
        hooks,
        projectDir,
      })
    );
  });

program
  .command('load <outputDir>')
  .description('Loads model from database')
  .action(outputDir => {
    const { engine, server, user, password, database } = program.opts();
    // const loadDataCondition = program.loadDataCondition
    //   ? table => table.name.match(new RegExp(program.loadDataCondition, 'i'))
    //   : null;
    // const hooks = [];

    dbmodel.runAndExit(
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
  .command('build <projectDir> <outputFile>')
  .description('Builds single SQL script from project')
  .action((projectDir, outputFile) => {
    const { client } = program;
    const hooks = [];
    dbmodel.runAndExit(
      dbmodel.build({
        client,
        hooks,
        projectDir,
        outputFile,
      })
    );
  });

program.parse(process.argv);
