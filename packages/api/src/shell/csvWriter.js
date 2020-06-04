const csv = require('csv');
const fs = require('fs');

async function csvWriter({ fileName, encoding = 'utf-8', ...options }) {
  console.log(`Writing file ${fileName}`);
  const csvStream = csv.stringify(options);
  const fileStream = fs.createWriteStream(fileName, encoding);
  csvStream.pipe(fileStream);
  csvStream['finisher'] = fileStream;
  return csvStream;
}

module.exports = csvWriter;
