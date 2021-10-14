const {
  getAlterDatabaseScript,
  generateDbPairingId,
  matchPairedObjects,
  databaseInfoFromYamlModel,
  extendDatabaseInfo,
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
}) {
  if (!driver) driver = requireEngineDriver(connection);
  if (!analysedStructure) {
    const pool = systemConnection || (await connectUtility(driver, connection));
    analysedStructure = await driver.analyseFull(pool);
  }

  const deployedModel = generateDbPairingId(
    extendDatabaseInfo(loadedDbModel ? databaseInfoFromYamlModel(loadedDbModel) : await importDbModel(modelFolder))
  );
  const currentModel = generateDbPairingId(extendDatabaseInfo(analysedStructure));
  const opts = {
    ignoreCase: true,
    schemaMode: 'ignore',
    ignoreConstraintNames: true,

    noDropTable: true,
    noDropColumn: true,
    noDropConstraint: true,
    noDropSqlObject: true,
    noRenameTable: true,
    noRenameColumn: true,
    ignoreForeignKeyActions: true,
  };
  const currentModelPaired = matchPairedObjects(deployedModel, currentModel, opts);
  // console.log('deployedModel', deployedModel.tables[0]);
  // console.log('currentModel', currentModel.tables[0]);
  // console.log('currentModelPaired', currentModelPaired.tables[0]);
  const res = getAlterDatabaseScript(currentModelPaired, deployedModel, opts, deployedModel, driver);
  return res;
}

module.exports = generateDeploySql;
