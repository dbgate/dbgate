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

  readLine(readerInfo) {
    return new Promise((resolve, reject) => {
      const { reader } = readerInfo;
      if (!reader.hasNextLine()) {
        resolve(null);
        return;
      }
      reader.nextLine((err, line) => {
        if (readerInfo.readedSchemaRow) readerInfo.readedDataRowCount += 1;
        else readerInfo.readedSchemaRow = true;
        if (err) reject(err);
        resolve(line);
      });
    });
  },

  openReader(jslid) {
    // console.log('OPENING READER');
    // console.log(
    //   'OPENING READER, LINES=',
    //   fs.readFileSync(path.join(jsldir(), `${jslid}.jsonl`), 'utf-8').split('\n').length
    // );
    const file = path.join(jsldir(), `${jslid}.jsonl`);
    return new Promise((resolve, reject) =>
      lineReader.open(file, (err, reader) => {
        if (err) reject(err);
        const readerInfo = {
          reader,
          readedDataRowCount: 0,
          readedSchemaRow: false,
          isReading: true,
        };
        this.openedReaders[jslid] = readerInfo;
        resolve(readerInfo);
      })
    );
  },

  async ensureReader(jslid, offset) {
    if (this.openedReaders[jslid] && this.openedReaders[jslid].readedDataRowCount > offset) {
      await this.closeReader(jslid);
    }
    let readerInfo = this.openedReaders[jslid];
    if (!this.openedReaders[jslid]) {
      readerInfo = await this.openReader(jslid);
    }
    readerInfo.isReading = true;
    if (!readerInfo.readedSchemaRow) {
      await this.readLine(readerInfo); // skip structure
    }
    while (readerInfo.readedDataRowCount < offset) {
      await this.readLine(readerInfo);
    }
    return readerInfo;
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
    const readerInfo = await this.ensureReader(jslid, offset);
    const res = [];
    for (let i = 0; i < limit; i += 1) {
      const line = await this.readLine(readerInfo);
      if (line == null) break;
      res.push(JSON.parse(line));
    }
    readerInfo.isReading = false;
    if (readerInfo.closeAfterReadAndSendStats) {
      await this.closeReader(jslid);
      socket.emit(`jsldata-stats-${jslid}`, readerInfo.closeAfterReadAndSendStats);
      readerInfo.closeAfterReadAndSendStats = null;
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
    const readerInfo = this.openedReaders[stats.jslid];
    if (readerInfo && readerInfo.isReading) {
      readerInfo.closeAfterReadAndSendStats = stats;
    } else {
      await this.closeReader(stats.jslid);
      socket.emit(`jsldata-stats-${stats.jslid}`, stats);
    }
  },
};
