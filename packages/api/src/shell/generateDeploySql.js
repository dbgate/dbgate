const {
  getAlterDatabaseScript,
  generateDbPairingId,
  matchPairedObjects,
  databaseInfoFromYamlModel,
  extendDatabaseInfo,
  modelCompareDbDiffOptions,
  enrichWithPreloadedRows,
  skipNamesInStructureByRegex,
  replaceSchemaInStructure,
  filterStructureBySchema,
  skipDbGateInternalObjects,
} = require('dbgate-tools');
const importDbModel = require('../utility/importDbModel');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');

/**
 * Generates query for deploying model into database
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
async function generateDeploySql({
  connection,
  systemConnection = undefined,
  driver = undefined,
  analysedStructure = undefined,
  modelFolder = undefined,
  loadedDbModel = undefined,
  modelTransforms = undefined,
  dbdiffOptionsExtra = {},
  ignoreNameRegex = '',
  targetSchema = null,
  maxMissingTablesRatio = undefined,
}) {
  if (!driver) driver = requireEngineDriver(connection);

  const dbhan = systemConnection || (await connectUtility(driver, connection, 'read'));
  if (
    driver?.dialect?.multipleSchema &&
    !targetSchema &&
    dbdiffOptionsExtra?.['schemaMode'] !== 'ignore' &&
    dbdiffOptionsExtra?.['schemaMode'] !== 'ignoreImplicit'
  ) {
    throw new Error('targetSchema is required for databases with multiple schemas');
  }

  try {
    if (!analysedStructure) {
      analysedStructure = await driver.analyseFull(dbhan);
    }

    let deployedModelSource = loadedDbModel
      ? databaseInfoFromYamlModel(loadedDbModel)
      : await importDbModel(modelFolder);

    if (ignoreNameRegex) {
      analysedStructure = skipNamesInStructureByRegex(analysedStructure, new RegExp(ignoreNameRegex, 'i'));
      deployedModelSource = skipNamesInStructureByRegex(deployedModelSource, new RegExp(ignoreNameRegex, 'i'));
    }
    analysedStructure = skipDbGateInternalObjects(analysedStructure);

    for (const transform of modelTransforms || []) {
      deployedModelSource = transform(deployedModelSource);
    }

    if (targetSchema) {
      deployedModelSource = replaceSchemaInStructure(deployedModelSource, targetSchema);
      analysedStructure = filterStructureBySchema(analysedStructure, targetSchema);
    }

    const deployedModel = generateDbPairingId(extendDatabaseInfo(deployedModelSource));
    const currentModel = generateDbPairingId(extendDatabaseInfo(analysedStructure));
    const opts = {
      ...modelCompareDbDiffOptions,

      noDropTable: true,
      noDropColumn: true,
      noDropConstraint: true,
      noDropSqlObject: true,
      noRenameTable: true,
      noRenameColumn: true,

      ...dbdiffOptionsExtra,
    };
    const currentModelPaired = matchPairedObjects(deployedModel, currentModel, opts);
    const currentModelPairedPreloaded = await enrichWithPreloadedRows(deployedModel, currentModelPaired, dbhan, driver);

    if (maxMissingTablesRatio != null) {
      const missingTables = currentModelPaired.tables.filter(
        x => !deployedModel.tables.find(y => y.pairingId == x.pairingId)
      );
      const missingTableCount = missingTables.length;
      const missingTablesRatio = missingTableCount / (currentModelPaired.tables.length || 1);
      if (missingTablesRatio > maxMissingTablesRatio) {
        throw new Error(`Too many missing tables (${missingTablesRatio * 100}%), aborting deploy`);
      }
    }

    // console.log('currentModelPairedPreloaded', currentModelPairedPreloaded.tables[0]);
    // console.log('deployedModel', deployedModel.tables[0]);
    // console.log('currentModel', currentModel.tables[0]);
    // console.log('currentModelPaired', currentModelPaired.tables[0]);
    const res = getAlterDatabaseScript(
      currentModelPairedPreloaded,
      deployedModel,
      opts,
      currentModelPairedPreloaded,
      deployedModel,
      driver
    );

    return res;
  } finally {
    if (!systemConnection) {
      await driver.close(dbhan);
    }
  }
}

module.exports = generateDeploySql;
