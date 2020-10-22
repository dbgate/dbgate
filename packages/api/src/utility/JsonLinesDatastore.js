const lineReader = require('line-reader');

class JsonLinesDatastore {
  constructor(file) {
    this.file = file;
    this.readerInfo = {
      reader: null,
      readedDataRowCount: 0,
      readedSchemaRow: false,
      isReading: false,
      closeAfterRead: null,
      closeAfterReadPromise: null,
    };
  }

  async closeReader() {
    if (!this.readerInfo) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.readerInfo.reader.close((err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  async notifyChanged() {
    if (this.readerInfo && this.readerInfo.isReading) {
      if (this.readerInfo.closeAfterRead) {
        return this.readerInfo.closeAfterReadPromise;
      }
      const promise = new Promise((resolve, reject) => {
        this.readerInfo.closeAfterRead = resolve;
      });
      this.readerInfo.closeAfterReadPromise = promise;
      return promise;
    } else {
      await this.closeReader();
    }
  }

  async openReader() {
    return new Promise((resolve, reject) =>
      lineReader.open(this.file, (err, reader) => {
        if (err) reject(err);

        const readerInfo = {
          reader,
          readedDataRowCount: 0,
          readedSchemaRow: false,
          isReading: true,
          closeAfterRead: null,
          closeAfterReadPromise: null,
        };
        this.readerInfo = readerInfo;
        resolve(readerInfo);
      })
    );
  }

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
  }

  async ensureReader(offset) {
    if (this.readerInfo && this.readerInfo.readedDataRowCount > offset) {
      await this.closeReader();
    }
    let readerInfo = this.readerInfo;
    if (!readerInfo || !readerInfo.reader) {
      readerInfo = await this.openReader();
    }
    readerInfo.isReading = true;
    if (!readerInfo.readedSchemaRow) {
      await this.readLine(readerInfo); // skip structure
    }
    while (readerInfo.readedDataRowCount < offset) {
      await this.readLine(readerInfo);
    }
    return readerInfo;
  }

  async getRows(offset, limit) {
    const readerInfo = await this.ensureReader(offset);
    const res = [];
    for (let i = 0; i < limit; i += 1) {
      const line = await this.readLine(readerInfo);
      if (line == null) break;
      res.push(JSON.parse(line));
    }
    readerInfo.isReading = false;
    if (readerInfo.closeAfterRead) {
      await this.closeReader();
      // socket.emit(`jsldata-stats-${jslid}`, readerInfo.closeAfterReadAndSendStats);
      const resolve = readerInfo.closeAfterRead;
      readerInfo.closeAfterRead = null;
      readerInfo.closeAfterReadPromise = null;
      resolve();
    }
    return res;
  }
}

module.exports = JsonLinesDatastore;
