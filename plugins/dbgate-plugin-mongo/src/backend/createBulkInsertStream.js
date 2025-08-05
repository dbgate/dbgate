const ObjectId = require('mongodb').ObjectId;
const { getLogger, extractErrorLogData } = global.DBGATE_PACKAGES['dbgate-tools'];
const { EJSON } = require('bson');

const logger = getLogger('mongoBulkInsert');

function createBulkInsertStream(driver, stream, dbhan, name, options) {
  const collectionName = name.pureName;
  const db = dbhan.getDatabase();

  const writable = new stream.Writable({
    objectMode: true,
  });

  writable.buffer = [];
  writable.wasHeader = false;

  writable.addRow = (row) => {
    if (!writable.wasHeader) {
      writable.wasHeader = true;
      if (row.__isStreamHeader) return;
    }
    if (options.createStringId) {
      row = {
        _id: new ObjectId().toString(),
        ...row,
      };
    }
    writable.buffer.push(EJSON.deserialize(row));
  };

  writable.checkStructure = async () => {
    try {
      if (options.dropIfExists) {
        logger.info(`DBGM-00137 Dropping collection ${collectionName}`);
        await db.collection(collectionName).drop();
      }
      if (options.truncate) {
        logger.info(`DBGM-00138 Truncating collection ${collectionName}`);
        await db.collection(collectionName).deleteMany({});
      }
    } catch (err) {
      logger.error(extractErrorLogData(err), 'DBGM-00139 Error during preparing mongo bulk insert collection, stopped');
      writable.destroy(err);
    }
  };

  writable.send = async () => {
    try {
      const rows = writable.buffer;
      writable.buffer = [];

      await db.collection(collectionName).insertMany(rows);
    } catch (err) {
      logger.error(extractErrorLogData(err), 'DBGM-00197 Error bulk insert collection, stopped');
      writable.destroy(err);
    }
  };

  writable.sendIfFull = async () => {
    if (writable.buffer.length > 100) {
      await writable.send();
    }
  };

  writable._write = async (chunk, encoding, callback) => {
    writable.addRow(chunk);
    await writable.sendIfFull();
    callback();
  };

  writable._final = async (callback) => {
    await writable.send();
    callback();
  };

  return writable;
}

module.exports = createBulkInsertStream;
