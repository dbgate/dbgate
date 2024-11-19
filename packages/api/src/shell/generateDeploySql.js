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
const connectUtility = require('../utility/connectUtility');

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
