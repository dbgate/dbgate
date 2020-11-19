const lineReader = require('line-reader');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();
const stableStringify = require('json-stable-stringify');
const { evaluateCondition } = require('dbgate-sqltree');

async function fetchNextLine(reader) {
  return new Promise((resolve, reject) => {
    if (!reader.hasNextLine()) {
      resolve(null);
      return;
    }

    reader.nextLine((err, line) => {
      if (err) {
        reject(err);
      } else {
        resolve(line);
      }
    });
  });
}

class JsonLinesDatastore {
  constructor(file) {
    this.file = file;
    this.reader = null;
    this.readedDataRowCount = 0;
    this.readedSchemaRow = false;
    this.notifyChangedCallback = null;
    this.currentFilter = null;
  }

  _closeReader() {
    if (!this.reader) return;
    const reader = this.reader;
    this.reader = null;
    this.readedDataRowCount = 0;
    this.readedSchemaRow = false;
    this.currentFilter = null;
    reader.close(() => {});
  }

  async notifyChanged(callback) {
    this.notifyChangedCallback = callback;
    await lock.acquire('reader', async () => {
      this._closeReader();
    });
    const call = this.notifyChangedCallback;
    this.notifyChangedCallback = null;
    if (call) call();
  }

  async _openReader() {
    return new Promise((resolve, reject) =>
      lineReader.open(this.file, (err, reader) => {
        if (err) reject(err);
        resolve(reader);
      })
    );
  }

  async _readLine(parse) {
    for (;;) {
      const line = await fetchNextLine(this.reader);
      if (!line) {
        // EOF
        return null;
      }

      if (!this.readedSchemaRow) {
        this.readedSchemaRow = true;
        return true;
      }
      if (this.currentFilter) {
        const parsedLine = JSON.parse(line);
        if (evaluateCondition(this.currentFilter, parsedLine)) {
          this.readedDataRowCount += 1;
          return parse ? parsedLine : true;
        }
      } else {
        this.readedDataRowCount += 1;
        return parse ? JSON.parse(line) : true;
      }
    }

    // return new Promise((resolve, reject) => {
    //   const reader = this.reader;
    //   if (!reader.hasNextLine()) {
    //     resolve(null);
    //     return;
    //   }

    //   reader.nextLine((err, line) => {
    //     if (err) {
    //       reject(err);
    //       return;
    //     }
    //     if (!this.readedSchemaRow) {
    //       this.readedSchemaRow = true;
    //       resolve(true);
    //       return;
    //     }
    //     if (this.currentFilter) {
    //       const parsedLine = JSON.parse(line);
    //       if (evaluateCondition(this.currentFilter, parsedLine)) {
    //         console.log('TRUE');
    //         resolve(parse ? parsedLine : true);
    //         this.readedDataRowCount += 1;
    //         return;
    //       } else {
    //         console.log('FALSE');
    //         // skip row
    //         return;
    //       }
    //     }

    //     this.readedDataRowCount += 1;
    //     resolve(parse ? JSON.parse(line) : true);
    //   });
    // });
  }

  async _ensureReader(offset, filter) {
    if (this.readedDataRowCount > offset || stableStringify(filter) != stableStringify(this.currentFilter)) {
      this._closeReader();
    }
    if (!this.reader) {
      const reader = await this._openReader();
      this.reader = reader;
      this.currentFilter = filter;
    }
    if (!this.readedSchemaRow) {
      await this._readLine(false); // skip structure
    }
    while (this.readedDataRowCount < offset) {
      await this._readLine(false);
    }
  }

  async getRows(offset, limit, filter) {
    const res = [];
    await lock.acquire('reader', async () => {
      await this._ensureReader(offset, filter);
      for (let i = 0; i < limit; i += 1) {
        const line = await this._readLine(true);
        if (line == null) break;
        res.push(line);
      }
    });
    // console.log('RETURN', res.length);
    return res;
  }
}

module.exports = JsonLinesDatastore;
