const { databaseInfoFromYamlModel, DatabaseAnalyser } = require('dbgate-tools');
const loadModelFolder = require('./loadModelFolder');

async function importDbModel(inputDir) {
  const files = await loadModelFolder(inputDir);
  return databaseInfoFromYamlModel(files);
}

module.exports = importDbModel;
