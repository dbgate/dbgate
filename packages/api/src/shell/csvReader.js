const csv = require('csv');
const fs = require('fs');

async function csvReader({ fileName, encoding = 'utf-8', ...options }) {
  console.log(`Reading file ${fileName}`);
  const csvStream = csv.parse({
    columns: true,
    ...options,
  });
  const fileStream = fs.createReadStream(fileName, encoding);
  fileStream.pipe(csvStream);
  return csvStream;
}

module.exports = csvReader;
