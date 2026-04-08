const fsReverse = require('fs-reverse');
const fs = require('fs-extra');
const path = require('path');
const { datadir } = require('../utility/directories');
const _ = require('lodash');
const { filterName } = require('dbgate-tools');
const socket = require('../utility/socket');

function readCore(reader, skip, limit, filter) {
  return new Promise((resolve, reject) => {
    const res = [];
    let readed = 0;
    reader.on('data', line => {
      if (!line && !line.trim()) return;
      try {
        const json = JSON.parse(line);
        if (filterName(filter, json.sql, json.database)) {
          if (!skip || readed >= skip) {
            res.push(json);
          }
          readed++;
          if (limit && readed > (skip || 0) + limit) {
            reader.destroy();
            resolve(res);
          }
        }
      } catch (err) {
        reader.destroy();
        reject(err);
      }
    });
    reader.on('end', () => resolve(res));
  });
}

function readJsonl({ skip, limit, filter }) {
  return new Promise(async (resolve, reject) => {
    const fileName = path.join(datadir(), 'query-history.jsonl');
    // @ts-ignore
    if (!(await fs.exists(fileName))) return resolve([]);
    const reader = fsReverse(fileName);
    const res = await readCore(reader, skip, limit, filter);
    resolve(res);
  });
}

module.exports = {
  read_meta: true,
  async read({ skip, limit, filter }, req) {
    const storage = require('./storage');
    const storageResult = await storage.readQueryHistory({ skip, limit, filter }, req);
    if (storageResult) return storageResult;
    return readJsonl({ skip, limit, filter });
  },

  write_meta: true,
  async write({ data }, req) {
    const storage = require('./storage');
    const written = await storage.writeQueryHistory({ data }, req);
    if (written) {
      socket.emit('query-history-changed');
      return 'OK';
    }

    const fileName = path.join(datadir(), 'query-history.jsonl');
    await fs.appendFile(fileName, JSON.stringify(data) + '\n');
    socket.emit('query-history-changed');
    return 'OK';
  },
};
