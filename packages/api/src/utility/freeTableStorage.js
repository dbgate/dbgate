const fs = require('fs-extra');

async function saveFreeTableData(file, data) {
  const { structure, rows } = data;
  const fileStream = fs.createWriteStream(file);
  await fileStream.write(JSON.stringify({ __isStreamHeader: true, ...structure }) + '\n');
  for (const row of rows) {
    await fileStream.write(JSON.stringify(row) + '\n');
  }
  await fileStream.close();
}

module.exports = {
  saveFreeTableData,
};
