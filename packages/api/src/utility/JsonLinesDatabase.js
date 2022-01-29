const fs = require('fs-extra');
const uuidv1 = require('uuid/v1');

// const lineReader = require('line-reader');
// const { fetchNextLineFromReader } = require('./JsonLinesDatastore');

export default class JsonLinesDatabase {
  constructor(filename) {
    this.filename = filename;
    this.data = [];
    this.loaded = false;
  }

  async _read() {
    this.data = [];
    if (!(await fs.exists(this.filename))) return;
    try {
      const text = await fs.readFile(this.filename, { encoding: 'utf-8' });
      this.data = text
        .split('\n')
        .filter(x => x.trim())
        .map(x => JSON.parse(x));
    } catch (err) {
      console.error(`Error loading file ${this.filename}`, err);
    }
  }

  async _write() {
    await fs.writeFile(this.filename, this.data.map(x => JSON.stringify(x)).join('\n'));
  }

  async _ensureLoaded() {
    if (!this.loaded) {
      this._read();
      this.loaded = true;
    }
  }

  async insert(obj) {
    if (obj._id && (await this.get(obj._id))) {
      throw new Error(`Cannot insert duplicate ID ${obj._id} into ${this.filename}`);
    }
    const elem = obj._id
      ? obj
      : {
          ...obj,
          _id: uuidv1(),
        };
    this.data.push(elem);
    await this._write();
    return elem;
  }

  async get(id) {
    return this.data.find(x => x._id == id);
  }

  async find(cond) {
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
    this.data = this.data.map(x => (x._id == obj._id ? obj : x));
    await this._write();
  }

  async patch(id, values) {
    this.data = this.data.map(x => (x._id == id ? { ...x, ...values } : x));
    await this._write();
  }

  async remove(id) {
    this.data = this.data.filter(x => x._id!=id);
    await this._write();
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
