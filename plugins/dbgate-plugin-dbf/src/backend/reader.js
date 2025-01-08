const _ = require('lodash');
const csv = require('csv');
const fs = require('fs');
const stream = require('stream');
const { DBFFile } = require('dbffile');

const { getLogger, extractErrorLogData } = global.DBGATE_PACKAGES['dbgate-tools'];

const logger = getLogger('dbfReader');

let dbgateApi;

function getFieldType(field) {
  const { type, size } = field;
  switch (type) {
    case 'C':
      return `varchar(${size})`;
    case 'N':
      return 'numeric';
    case 'F':
      return 'float';
    case 'Y':
      return 'money';
    case 'I':
      return 'int';
    case 'L':
      return 'boolean';
    case 'D':
      return 'date';
    case 'T':
      return 'datetime';
    case 'B':
      return 'duouble';
    case 'M':
      return 'varchar(max)';
    default:
      return 'string';
  }
}

async function reader({ fileName, encoding = 'ISO-8859-1', includeDeletedRecords = false, limitRows = undefined }) {
  console.log(`Reading file ${fileName}`);
  const downloadedFile = await dbgateApi.download(fileName);

  const pass = new stream.PassThrough({
    objectMode: true,
  });

  (async () => {
    try {
      // Open the DBF file
      const dbf = await DBFFile.open(downloadedFile, { encoding, includeDeletedRecords });

      const columns = dbf.fields.map((field) => ({
        columnName: field.name,
        dataType: getFieldType(field),
      }));

      pass.write({
        __isStreamHeader: true,
        columns,
      });

      let readedRows = 0;
      // Read each record and push it into the stream
      for await (const record of dbf) {
        // Emit the record as a chunk
        pass.write(record);
        readedRows++;
        if (limitRows && readedRows >= limitRows) {
          break;
        }
      }

      pass.end();
    } catch (error) {
      // If any error occurs, destroy the stream with the error
      logger.error(extractErrorLogData(error), 'Error reading DBF file');
      pass.end();
    }
  })();

  return pass;
}

reader.initialize = (dbgateEnv) => {
  dbgateApi = dbgateEnv.dbgateApi;
};

module.exports = reader;
