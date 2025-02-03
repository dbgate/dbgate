const generateDeploySql = require('./generateDeploySql');
const executeQuery = require('./executeQuery');
const { ScriptDrivedDeployer } = require('dbgate-datalib');
const { connectUtility } = require('../utility/connectUtility');
const requireEngineDriver = require('../utility/requireEngineDriver');
const loadModelFolder = require('../utility/loadModelFolder');
const crypto = require('crypto');

/**
 * Deploys database model stored in modelFolder (table as yamls) to database
 * @param {object} options
 * @param {connectionType} options.connection - connection object
 * @param {object} options.systemConnection - system connection (result of driver.connect). If not provided, new connection will be created
 * @param {object} options.driver - driver object. If not provided, it will be loaded from connection
 * @param {object} options.analysedStructure - analysed structure of the database. If not provided, it will be loaded
 * @param {string} options.modelFolder - folder with model files (YAML files for tables, SQL files for views, procedures, ...)
 * @param {import('dbgate-tools').DatabaseModelFile[]} options.loadedDbModel - loaded database model - collection of yaml and SQL files loaded into array
 * @param {function[]} options.modelTransforms - array of functions for transforming model
 * @param {object} options.dbdiffOptionsExtra - extra options for dbdiff
 * @param {string} options.ignoreNameRegex - regex for ignoring objects by name
 * @param {string} options.targetSchema - target schema for deployment
 * @param {number} options.maxMissingTablesRatio - maximum ratio of missing tables in database. Safety check, if missing ratio is highe, deploy is stopped (preventing accidental drop of all tables)
 */
async function deployDb({
  connection,
  systemConnection,
  driver,
  analysedStructure,
  modelFolder,
  loadedDbModel,
  modelTransforms,
  dbdiffOptionsExtra,
  ignoreNameRegex = '',
  targetSchema = null,
  maxMissingTablesRatio = undefined,
}) {
  if (!driver) driver = requireEngineDriver(connection);
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'read'));

  try {
    const scriptDeployer = new ScriptDrivedDeployer(
      dbhan,
      driver,
      Array.isArray(loadedDbModel) ? loadedDbModel : modelFolder ? await loadModelFolder(modelFolder) : [],
      crypto
    );
    await scriptDeployer.runPre();

    const { sql } = await generateDeploySql({
      connection,
      systemConnection: dbhan,
      driver,
      analysedStructure,
      modelFolder,
      loadedDbModel,
      modelTransforms,
      dbdiffOptionsExtra,
      ignoreNameRegex,
      targetSchema,
      maxMissingTablesRatio,
    });
    // console.log('RUNNING DEPLOY SCRIPT:', sql);
    await executeQuery({ connection, systemConnection: dbhan, driver, sql, logScriptItems: true });

    await scriptDeployer.runPost();
  } finally {
    if (!systemConnection) {
      await driver.close(dbhan);
    }
  }
}

module.exports = deployDb;
