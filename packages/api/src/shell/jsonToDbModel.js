const exportDbModel = require('../utility/exportDbModel');
const fs = require('fs');

async function jsonToDbModel({ modelFile, outputDir }) {
  const dbInfo = JSON.parse(fs.readFileSync(modelFile, 'utf-8'));
  await exportDbModel(dbInfo, outputDir);
}

module.exports = jsonToDbModel;
