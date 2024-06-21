const importDbModel = require('../utility/importDbModel');
const fs = require('fs');

async function dbModelToJson({ modelFolder, outputFile, commonjs }) {
  const dbInfo = await importDbModel(modelFolder);

  const json = JSON.stringify(dbInfo, null, 2);
  if (commonjs) {
    fs.writeFileSync(outputFile, `module.exports = ${json};`);
    return;
  } else {
    fs.writeFileSync(outputFile, json);
  }
}

module.exports = dbModelToJson;
