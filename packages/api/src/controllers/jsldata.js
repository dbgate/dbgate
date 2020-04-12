const path = require('path');
const fs = require('fs');
const lineReader = require('line-reader');
const { jsldir } = require('../utility/directories');

module.exports = {
  openedReaders: {},

  closeReader(jslid) {
    // console.log('CLOSING READER');
    if (!this.openedReaders[jslid]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.openedReaders[jslid].reader.close((err) => {
        if (err) reject(err);
        delete this.openedReaders[jslid];
        resolve();
      });
    });
  },

  readLine(jslid) {
    if (!this.openedReaders[jslid]) return Promise.reject();
    return new Promise((resolve, reject) => {
      const { reader } = this.openedReaders[jslid];
      if (!reader.hasNextLine()) {
        resolve(null);
        return;
      }
      reader.nextLine((err, line) => {
        this.openedReaders[jslid].readedCount += 1;
        if (err) reject(err);
        resolve(line);
      });
    });
  },

  openReader(jslid) {
    // console.log('OPENING READER');
    const file = path.join(jsldir(), `${jslid}.jsonl`);
    return new Promise((resolve, reject) =>
      lineReader.open(file, (err, reader) => {
        if (err) reject(err);
        resolve();
        this.openedReaders[jslid] = {
          reader,
          readedCount: 0,
        };
      })
    );
  },

  async ensureReader(jslid, offset) {
    if (this.openedReaders[jslid] && this.openedReaders[jslid].readedCount > offset) {
      await this.closeReader(jslid);
    }
    if (!this.openedReaders[jslid]) {
      await this.openReader(jslid);
    }
    while (this.openedReaders[jslid].readedCount < offset) {
      await this.readLine(jslid);
    }
  },

  getInfo_meta: 'get',
  getInfo({ jslid }) {
    const file = path.join(jsldir(), `${jslid}.jsonl.info`);
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  },

  getRows_meta: 'get',
  async getRows({ jslid, offset, limit }) {
    await this.ensureReader(jslid, offset);
    const res = [];
    for (let i = 0; i < limit; i += 1) {
      const line = await this.readLine(jslid);
      if (line == null) break;
      res.push(JSON.parse(line));
    }
    return res;
  },
};
