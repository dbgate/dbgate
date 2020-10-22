const lineReader = require('line-reader');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();

class JsonLinesDatastore {
  constructor(file) {
    this.file = file;
    this.reader = null;
    this.readedDataRowCount = 0;
    this.readedSchemaRow = false;
    this.notifyChangedCallback = null;
  }

  closeReader() {
    if (!this.reader) return;
    const reader = this.reader;
    this.reader = null;
    this.readedDataRowCount = 0;
    this.readedSchemaRow = false;
    reader.close(() => {});
  }

  async notifyChanged(callback) {
    this.notifyChangedCallback = callback;
    await lock.acquire('reader', async () => {
      this.closeReader();
    });
    const call = this.notifyChangedCallback;
    this.notifyChangedCallback = null;
    if (call) call();
  }

  async openReader() {
    return new Promise((resolve, reject) =>
      lineReader.open(this.file, (err, reader) => {
        if (err) reject(err);
        resolve(reader);
      })
    );
  }

  readLine() {
    return new Promise((resolve, reject) => {
      const reader = this.reader;
      if (!reader.hasNextLine()) {
        resolve(null);
        return;
      }
      reader.nextLine((err, line) => {
        if (this.readedSchemaRow) this.readedDataRowCount += 1;
        else this.readedSchemaRow = true;
        if (err) reject(err);
        resolve(line);
      });
    });
  }

  async ensureReader(offset) {
    if (this.readedDataRowCount > offset) {
      this.closeReader();
    }
    if (!this.reader) {
      const reader = await this.openReader();
      this.reader = reader;
    }
    if (!this.readedSchemaRow) {
      await this.readLine(); // skip structure
    }
    while (this.readedDataRowCount < offset) {
      await this.readLine();
    }
  }

  async getRows(offset, limit) {
    const res = [];
    await lock.acquire('reader', async () => {
      await this.ensureReader(offset);
      for (let i = 0; i < limit; i += 1) {
        const line = await this.readLine();
        if (line == null) break;
        res.push(JSON.parse(line));
      }
    });
    // console.log('RETURN', res.length);
    return res;
  }
}

module.exports = JsonLinesDatastore;
