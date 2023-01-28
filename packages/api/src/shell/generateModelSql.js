const requireEngineDriver = require('../utility/requireEngineDriver');
const {
  extendDatabaseInfo,
  databaseInfoFromYamlModel,
  getAlterDatabaseScript,
  DatabaseAnalyser,
} = require('dbgate-tools');
const importDbModel = require('../utility/importDbModel');
const fs = require('fs');

async function generateModelSql({ engine, driver, modelFolder, loadedDbModel, outputFile }) {
  if (!driver) driver = requireEngineDriver(engine);

  const dbInfo = extendDatabaseInfo(
    loadedDbModel ? databaseInfoFromYamlModel(loadedDbModel) : await importDbModel(modelFolder)
  );

  const { sql } = getAlterDatabaseScript(
    DatabaseAnalyser.createEmptyStructure(),
    dbInfo,
    {},
    DatabaseAnalyser.createEmptyStructure(),
    dbInfo,
    driver
  );

  fs.writeFileSync(outputFile, sql);
}

module.exports = generateModelSql;
