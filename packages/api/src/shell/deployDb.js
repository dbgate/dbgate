const generateDeploySql = require('./generateDeploySql');
const executeQuery = require('./executeQuery');

async function deployDb({ connection, systemConnection, driver, analysedStructure, modelFolder, loadedDbModel }) {
  const { sql } = await generateDeploySql({
    connection,
    systemConnection,
    driver,
    analysedStructure,
    modelFolder,
    loadedDbModel,
  });
  // console.log('RUNNING DEPLOY SCRIPT:', sql);
  await executeQuery({ connection, systemConnection, driver, sql });
}

module.exports = deployDb;
