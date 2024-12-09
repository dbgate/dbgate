const crypto = require('crypto');
const AsyncLock = require('async-lock');
const fs = require('fs-extra');

const lock = new AsyncLock();

// const lineReader = require('line-reader');
// const { fetchNextLineFromReader } = require('./JsonLinesDatastore');

class JsonLinesDatabase {
  constructor(filename) {
    this.filename = filename;
    this.data = [];
    this.loadedOk = false;
    this.loadPerformed = false;
  }

  async _save() {
    if (!this.loadedOk) {
      // don't override data
      return;
    }
    await fs.writeFile(this.filename, this.data.map(x => JSON.stringify(x)).join('\n'));
  }

  async unload() {
    this.data = [];
    this.loadedOk = false;
    this.loadPerformed = false;
  }

  async _ensureLoaded() {
    if (!this.loadPerformed) {
      await lock.acquire('reader', async () => {
        if (!this.loadPerformed) {
          if (!(await fs.exists(this.filename))) {
            this.loadedOk = true;
            this.loadPerformed = true;
            return;
          }
          try {
            const text = await fs.readFile(this.filename, { encoding: 'utf-8' });
            this.data = text
              .split('\n')
              .filter(x => x.trim())
              .map(x => JSON.parse(x));
            this.loadedOk = true;
          } catch (err) {
            console.error(`Error loading file ${this.filename}`, err);
          }
          this.loadPerformed = true;
        }
      });
    }
  }

  async insert(obj) {
    await this._ensureLoaded();
    if (obj._id && (await this.get(obj._id))) {
      throw new Error(`Cannot insert duplicate ID ${obj._id} into ${this.filename}`);
    }
    const elem = obj._id
      ? obj
      : {
          ...obj,
          _id: crypto.randomUUID(),
        };
    this.data.push(elem);
    await this._save();
    return elem;
  }

  async get(id) {
    await this._ensureLoaded();
    return this.data.find(x => x._id == id);
  }

  async find(cond) {
    await this._ensureLoaded();
    if (cond) {
      return this.data.filter(x => {
        for (const key of Object.keys(cond)) {
          if (x[key] != cond[key]) return false;
        }
        return true;
      });
    } else {
      return this.data;
    }
  }

  async update(obj) {
    await this._ensureLoaded();
    this.data = this.data.map(x => (x._id == obj._id ? obj : x));
    await this._save();
    return obj;
  }

  async updateAll(mapFunction) {
    await this._ensureLoaded();
    this.data = this.data.map(mapFunction);
    await this._save();
  }

  async patch(id, values) {
    await this._ensureLoaded();
    this.data = this.data.map(x => (x._id == id ? { ...x, ...values } : x));
    await this._save();
    return this.data.find(x => x._id == id);
  }

  async remove(id) {
    await this._ensureLoaded();
    const removed = this.data.find(x => x._id == id);
    this.data = this.data.filter(x => x._id != id);
    await this._save();
    return removed;
  }

  async transformAll(transformFunction) {
    await this._ensureLoaded();
    const newData = transformFunction(this.data);
    if (newData) {
      this.data = newData;
      await this._save();
    }
  }

  //   async _openReader() {
  //     return new Promise((resolve, reject) =>
  //       lineReader.open(this.filename, (err, reader) => {
  //         if (err) reject(err);
  //         resolve(reader);
  //       })
  //     );
  //   }

  //   async _read() {
  //     this.data = [];
  //     if (!(await fs.exists(this.filename))) return;
  //     try {
  //       const reader = await this._openReader();
  //       for (;;) {
  //         const line = await fetchNextLineFromReader(reader);
  //         if (!line) break;
  //         this.data.push(JSON.parse(line));
  //       }
  //     } catch (err) {
  //       console.error(`Error loading file ${this.filename}`, err);
  //     }
  //   }

  //   async _write() {
  //     const fw = fs.createWriteStream(this.filename);
  //     for (const obj of this.data) {
  //       await fw.write(JSON.stringify(obj));
  //       await fw.write('\n');
  //     }
  //     await fw.end();
  //   }
}

module.exports = JsonLinesDatabase;
