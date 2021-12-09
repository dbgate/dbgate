const ObjectId = require('mongodb').ObjectId;

function createBulkInsertStream(driver, stream, pool, name, options) {
  const collectionName = name.pureName;
  const db = pool.__getDatabase();

  const writable = new stream.Writable({
    objectMode: true,
  });

  writable.buffer = [];
  writable.wasHeader = false;

  writable.addRow = (row) => {
    if (!writable.wasHeader) {
      writable.wasHeader = true;
      if (
        row.__isStreamHeader ||
        // TODO remove isArray test
        Array.isArray(row.columns)
      )
        return;
    }
    if (options.createStringId) {
      row = {
        _id: new ObjectId().toString(),
        ...row,
      }
    }
    writable.buffer.push(row);
  };

  writable.checkStructure = async () => {
    if (options.dropIfExists) {
      console.log(`Dropping collection ${collectionName}`);
      await db.collection(collectionName).drop();
    }
    if (options.truncate) {
      console.log(`Truncating collection ${collectionName}`);
      await db.collection(collectionName).deleteMany({});
    }
  };

  writable.send = async () => {
    const rows = writable.buffer;
    writable.buffer = [];

    await db.collection(collectionName).insertMany(rows);
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
