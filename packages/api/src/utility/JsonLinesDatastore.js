const lineReader = require('line-reader');

class JsonLinesDatastore {
  constructor(file) {
    this.file = file;
    this.reader = null;
    this.readedDataRowCount = 0;

    this.readedSchemaRow = false;
    this.isReading = false;
    this.closeAfterRead = null;
    this.closeAfterReadCallback = null;
    this.closeAfterReadPromise = null;

    this.waitForReadyPromise = null;
    this.waitForReadyResolve = null;

    // this.readerInfo = {
    //   reader: null,
    //   readedDataRowCount: 0,
    //   readedSchemaRow: false,
    //   isReading: false,
    //   closeAfterRead: null,
    //   closeAfterReadPromise: null,
    // };
  }

  closeReader() {
    if (!this.reader) return;
    const reader = this.reader;
    this.reader = null;
    reader.close();
  }

  waitForReady() {
    if (this.isReading) {
      if (this.waitForReadyResolve) {
        return this.waitForReadyPromise;
      }
      const promise = new Promise((resolve, reject) => {
        this.waitForReadyResolve = resolve;
      });
      this.waitForReadyPromise = promise;
      return promise;
    }
    return Promise.resolve();
  }

  async notifyChanged(callback) {
    if (this.isReading) {
      this.closeAfterReadCallback = callback;
      if (this.closeAfterRead) {
        return this.closeAfterReadPromise;
      }
      const promise = new Promise((resolve, reject) => {
        this.closeAfterRead = resolve;
      });
      this.closeAfterReadPromise = promise;
      return promise;
    } else {
      this.closeReader();
    }
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
    console.log('ENSURE', offset);
    for (;;) {
      await this.waitForReady();
      if (this.readedDataRowCount > offset) {
        this.closeReader();
      }
      if (!this.reader) {
        const reader = await this.openReader();
        if (this.isReading) {
          reader.close(); // throw away this reader
          continue; // reader is already used by other getRows, wait for free reader
        }
        this.reader = reader;
        this.isReading = true;
        break;
      } else {
        break;
      }
    }
    if (!this.readedSchemaRow) {
      await this.readLine(); // skip structure
    }
    while (this.readedDataRowCount < offset) {
      await this.readLine();
    }
  }

  async getRows(offset, limit) {
    await this.ensureReader(offset);
    const res = [];
    for (let i = 0; i < limit; i += 1) {
      const line = await this.readLine();
      if (line == null) break;
      res.push(JSON.parse(line));
    }
    this.isReading = false;
    if (this.closeAfterRead) {
      if (this.closeAfterReadCallback) this.closeAfterReadCallback();
      this.closeReader();
      const resolve = this.closeAfterRead;
      this.closeAfterRead = null;
      this.closeAfterReadPromise = null;
      this.closeAfterReadCallback = null;
      resolve();
    }
    if (this.waitForReadyResolve) {
      const resolve = this.waitForReadyResolve;
      this.waitForReadyResolve = null;
      this.waitForReadyPromise = null;
      resolve();
    }
    console.log('RETURN', res.length);
    return res;
  }
}

module.exports = JsonLinesDatastore;
