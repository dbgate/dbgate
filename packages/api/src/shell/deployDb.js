const generateDeploySql = require('./generateDeploySql');
const executeQuery = require('./executeQuery');

async function deployDb({ connection, systemConnection, driver, analysedStructure, modelFolder, loadedDbModel }) {
  const sql = await generateDeploySql({
    connection,
    systemConnection,
    driver,
    analysedStructure,
    modelFolder,
    loadedDbModel,
  });
  await executeQuery({ connection, systemConnection, driver, sql });
}

module.exports = deployDb;
