const generateDeploySql = require('./generateDeploySql');
const executeQuery = require('./executeQuery');

async function deployDb({
  connection,
  systemConnection,
  driver,
  analysedStructure,
  modelFolder,
  loadedDbModel,
  modelTransforms,
  dbdiffOptionsExtra,
}) {
  const { sql } = await generateDeploySql({
    connection,
    systemConnection,
    driver,
    analysedStructure,
    modelFolder,
    loadedDbModel,
    modelTransforms,
    dbdiffOptionsExtra,
  });
  // console.log('RUNNING DEPLOY SCRIPT:', sql);
  await executeQuery({ connection, systemConnection, driver, sql, logScriptItems: true });
}

module.exports = deployDb;
