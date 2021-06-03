const fsReverse = require('fs-reverse');
const fs = require('fs-extra');
const path = require('path');
const { datadir } = require('../utility/directories');
const _ = require('lodash');
const { filterName } = require('dbgate-tools');

function readCore(reader, skip, limit, filter) {
  return new Promise(resolve => {
    const res = [];
    let readed = 0;
    reader.on('data', line => {
      const json = JSON.parse(line);
      if (filterName(filter, json.sql)) {
        if (!skip || readed >= skip) {
          res.push(json);
        }
        readed++;
        if (limit && readed > (skip || 0) + limit) {
          reader.destroy();
          resolve(res);
        }
      }
    });
    reader.on('end', () => resolve(res));
  });
}

module.exports = {
  read_meta: 'get',
  async read({ skip, limit, filter }) {
    const fileName = path.join(datadir(), 'query-history.jsonl');
    // @ts-ignore
    if (!(await fs.exists(fileName))) return [];
    const reader = fsReverse(fileName);
    const res = await readCore(reader, skip, limit, filter);
    return res;
  },

  write_meta: 'post',
  async write({ data }) {
    const fileName = path.join(datadir(), 'query-history.jsonl');
    await fs.appendFile(fileName, JSON.stringify(data) + '\n');
  },
};
