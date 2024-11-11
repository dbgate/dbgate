const generateDeploySql = require('./generateDeploySql');
const executeQuery = require('./executeQuery');
const { ScriptDrivedDeployer } = require('dbgate-datalib');
const connectUtility = require('../utility/connectUtility');
const requireEngineDriver = require('../utility/requireEngineDriver');
const loadModelFolder = require('../utility/loadModelFolder');

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
}) {
  if (!driver) driver = requireEngineDriver(connection);
  const dbhan = systemConnection || (await connectUtility(driver, connection, 'read'));

  try {
    const scriptDeployer = new ScriptDrivedDeployer(
      dbhan,
      driver,
      loadedDbModel ?? (await loadModelFolder(modelFolder))
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
