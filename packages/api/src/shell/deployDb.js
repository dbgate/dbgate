const EnsureStreamHeaderStream = require('../utility/EnsureStreamHeaderStream');
const importDbModel = require('../utility/importDbModel');

async function deployDb(connection, modelFolder, options) {
  const dbModel = await importDbModel(modelFolder);
}

module.exports = deployDb;
