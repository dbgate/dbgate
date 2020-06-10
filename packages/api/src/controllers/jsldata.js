const path = require('path');
const fs = require('fs');
const lineReader = require('line-reader');
const { jsldir } = require('../utility/directories');
const socket = require('../utility/socket');

function readFirstLine(file) {
  return new Promise((resolve, reject) => {
    lineReader.open(file, (err, reader) => {
      if (err) reject(err);
      if (reader.hasNextLine()) {
        reader.nextLine((err, line) => {
          if (err) reject(err);
          resolve(line);
        });
      } else {
        resolve(null);
      }
    });
  });
}

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
    console.log(
      'OPENING READER, LINES=',
      fs.readFileSync(path.join(jsldir(), `${jslid}.jsonl`), 'utf-8').split('\n').length
    );
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
    await this.readLine(jslid); // skip structure
    while (this.openedReaders[jslid].readedCount < offset) {
      await this.readLine(jslid);
    }
  },

  getInfo_meta: 'get',
  async getInfo({ jslid }) {
    const file = path.join(jsldir(), `${jslid}.jsonl`);
    const firstLine = await readFirstLine(file);
    if (firstLine) return JSON.parse(firstLine);
    return null;
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

  getStats_meta: 'get',
  getStats({ jslid }) {
    const file = path.join(jsldir(), `${jslid}.jsonl.stats`);
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  },

  async notifyChangedStats(stats) {
    console.log('SENDING STATS', JSON.stringify(stats));
    await this.closeReader(stats.jslid);
    socket.emit(`jsldata-stats-${stats.jslid}`, stats);
  },
};
