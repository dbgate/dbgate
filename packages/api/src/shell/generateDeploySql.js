const {
  getAlterDatabaseScript,
  generateDbPairingId,
  matchPairedObjects,
  databaseInfoFromYamlModel,
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
    loadedDbModel ? databaseInfoFromYamlModel(loadedDbModel) : await importDbModel(modelFolder)
  );
  const currentModel = generateDbPairingId(analysedStructure);
  const currentModelPaired = matchPairedObjects(deployedModel, currentModel);
  const { sql } = getAlterDatabaseScript(currentModelPaired, deployedModel, {}, deployedModel, driver);
  return sql;
}

module.exports = generateDeploySql;
