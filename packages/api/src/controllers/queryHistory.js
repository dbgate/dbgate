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

module.exports = {
  read_meta: true,
  async read({ skip, limit, filter }) {
    const fileName = path.join(datadir(), 'query-history.jsonl');
    // @ts-ignore
    if (!(await fs.exists(fileName))) return [];
    const reader = fsReverse(fileName);
    const res = await readCore(reader, skip, limit, filter);
    return res;
  },

  write_meta: true,
  async write({ data }) {
    const fileName = path.join(datadir(), 'query-history.jsonl');
    await fs.appendFile(fileName, JSON.stringify(data) + '\n');
    socket.emit('query-history-changed');
    return 'OK';
  },
};
