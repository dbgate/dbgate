const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();
const stableStringify = require('json-stable-stringify');
const { evaluateCondition } = require('dbgate-sqltree');
const { getLogger, extractErrorLogData } = require('dbgate-tools');
const { jsldir } = require('./directories');
const LineReader = require('./LineReader');
const { sortFile } = require('./externalSort');

const logger = getLogger('JsonLinesDatastore');

class JsonLinesDatastore {
  constructor(file, formatterFunction) {
    this.file = file;
    this.formatterFunction = formatterFunction;
    this.reader = null;
    this.readedDataRowCount = 0;
    this.readedSchemaRow = false;
    // this.firstRowToBeReturned = null;
    this.notifyChangedCallback = null;
    this.currentFilter = null;
    this.currentSort = null;
    if (formatterFunction) {
      const requirePluginFunction = require('./requirePluginFunction');
      this.rowFormatter = requirePluginFunction(formatterFunction);
    }
    this.sortedFiles = {};
  }

  static async sortFile(infile, outfile, sort) {
    return sortFile(infile, outfile, sort);
  }

  async _closeReader() {
    // console.log('CLOSING READER', this.reader);
    if (!this.reader) return;
    const reader = this.reader;
    this.reader = null;
    this.readedDataRowCount = 0;
    this.readedSchemaRow = false;
    // this.firstRowToBeReturned = null;
    this.currentFilter = null;
    this.currentSort = null;
    await reader.close();
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

  async _openReader(fileName) {
    // console.log('OPENING READER', fileName);
    // console.log(fs.readFileSync(fileName, 'utf-8'));

    const fileStream = fs.createReadStream(fileName);
    return new LineReader(fileStream);
  }

  parseLine(line) {
    const res = JSON.parse(line);
    return this.rowFormatter ? this.rowFormatter(res) : res;
  }

  async _readLine(parse) {
    // if (this.firstRowToBeReturned) {
    //   const res = this.firstRowToBeReturned;
    //   this.firstRowToBeReturned = null;
    //   return res;
    // }
    for (;;) {
      const line = await this.reader.readLine();
      if (!line) {
        // EOF
        return null;
      }

      if (!this.readedSchemaRow) {
        this.readedSchemaRow = true;
        const parsedLine = JSON.parse(line);
        if (parsedLine.__isStreamHeader) {
          // skip to next line
          continue;
        }
      }
      if (this.currentFilter) {
        const parsedLine = this.parseLine(line);
        if (evaluateCondition(this.currentFilter, parsedLine)) {
          this.readedDataRowCount += 1;
          return parse ? parsedLine : true;
        }
      } else {
        this.readedDataRowCount += 1;
        return parse ? this.parseLine(line) : true;
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

  async _ensureReader(offset, filter, sort) {
    if (
      this.readedDataRowCount > offset ||
      stableStringify(filter) != stableStringify(this.currentFilter) ||
      stableStringify(sort) != stableStringify(this.currentSort)
    ) {
      this._closeReader();
    }
    if (!this.reader) {
      const reader = await this._openReader(sort ? this.sortedFiles[stableStringify(sort)] : this.file);
      this.reader = reader;
      this.currentFilter = filter;
      this.currentSort = sort;
    }
    // if (!this.readedSchemaRow) {
    //   const line = await this._readLine(true); // skip structure
    //   if (!line.__isStreamHeader) {
    //     // line contains data
    //     this.firstRowToBeReturned = line;
    //   }
    // }
    while (this.readedDataRowCount < offset) {
      const line = await this._readLine(false);
      if (line == null) break;
      // if (this.firstRowToBeReturned) {
      //   this.firstRowToBeReturned = null;
      // } else {
      //   await this._readLine(false);
      // }
    }
  }

  async enumRows(eachRow) {
    await lock.acquire('reader', async () => {
      await this._ensureReader(0, null);
      for (;;) {
        const line = await this._readLine(true);
        if (line == null) break;
        const shouldContinue = eachRow(line);
        if (!shouldContinue) break;
      }
    });
  }

  async getRows(offset, limit, filter, sort) {
    const res = [];
    if (sort && !this.sortedFiles[stableStringify(sort)]) {
      const jslid = crypto.randomUUID();
      const sortedFile = path.join(jsldir(), `${jslid}.jsonl`);
      try {
        await JsonLinesDatastore.sortFile(this.file, sortedFile, sort);
        this.sortedFiles[stableStringify(sort)] = sortedFile;
      } catch (e) {
        logger.error(extractErrorLogData(e), 'DBGM-00000 Failed to sort data file, returning unsorted results');
        // Remove any partial output file left by the failed sort so it does
        // not accumulate in jsldir() across repeated failures.
        try { fs.unlinkSync(sortedFile); } catch { /* best-effort */ }
        sort = null;
      }
    }
    await lock.acquire('reader', async () => {
      await this._ensureReader(offset, filter, sort);
      // console.log(JSON.stringify(this.currentFilter, undefined, 2));
      for (let i = 0; i < limit; i += 1) {
        const line = await this._readLine(true);
        // console.log('READED LINE', i);
        if (line == null) break;
        res.push(line);
      }
    });
    return res;
  }
}

module.exports = JsonLinesDatastore;
