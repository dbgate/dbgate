const { filterName, getLogger, extractErrorLogData } = require('dbgate-tools');
const logger = getLogger('jsldata');
const { jsldir, archivedir } = require('../utility/directories');
const fs = require('fs');
const path = require('path');
const lineReader = require('line-reader');
const _ = require('lodash');
const { __ } = require('lodash/fp');
const DatastoreProxy = require('../utility/DatastoreProxy');
const getJslFileName = require('../utility/getJslFileName');
const JsonLinesDatastore = require('../utility/JsonLinesDatastore');
const requirePluginFunction = require('../utility/requirePluginFunction');
const socket = require('../utility/socket');
const crypto = require('crypto');
const dbgateApi = require('../shell');
const { ChartProcessor } = require('dbgate-datalib');

function readFirstLine(file) {
  return new Promise((resolve, reject) => {
    lineReader.open(file, (err, reader) => {
      if (err) {
        reject(err);
        return;
      }
      if (reader.hasNextLine()) {
        reader.nextLine((err, line) => {
          if (err) {
            reader.close(() => reject(err)); // Ensure reader is closed on error
            return;
          }
          reader.close(() => resolve(line)); // Ensure reader is closed after reading
        });
      } else {
        reader.close(() => resolve(null)); // Properly close if no lines are present
      }
    });
  });
}

module.exports = {
  datastores: {},

  // closeReader(jslid) {
  //   // console.log('CLOSING READER');
  //   if (!this.openedReaders[jslid]) return Promise.resolve();
  //   return new Promise((resolve, reject) => {
  //     this.openedReaders[jslid].reader.close((err) => {
  //       if (err) reject(err);
  //       delete this.openedReaders[jslid];
  //       resolve();
  //     });
  //   });
  // },

  // readLine(readerInfo) {
  //   return new Promise((resolve, reject) => {
  //     const { reader } = readerInfo;
  //     if (!reader.hasNextLine()) {
  //       resolve(null);
  //       return;
  //     }
  //     reader.nextLine((err, line) => {
  //       if (readerInfo.readedSchemaRow) readerInfo.readedDataRowCount += 1;
  //       else readerInfo.readedSchemaRow = true;
  //       if (err) reject(err);
  //       resolve(line);
  //     });
  //   });
  // },

  // openReader(jslid) {
  //   // console.log('OPENING READER');
  //   // console.log(
  //   //   'OPENING READER, LINES=',
  //   //   fs.readFileSync(path.join(jsldir(), `${jslid}.jsonl`), 'utf-8').split('\n').length
  //   // );
  //   const file = getJslFileName(jslid);
  //   return new Promise((resolve, reject) =>
  //     lineReader.open(file, (err, reader) => {
  //       if (err) reject(err);
  //       const readerInfo = {
  //         reader,
  //         readedDataRowCount: 0,
  //         readedSchemaRow: false,
  //         isReading: true,
  //       };
  //       this.openedReaders[jslid] = readerInfo;
  //       resolve(readerInfo);
  //     })
  //   );
  // },

  // async ensureReader(jslid, offset) {
  //   if (this.openedReaders[jslid] && this.openedReaders[jslid].readedDataRowCount > offset) {
  //     await this.closeReader(jslid);
  //   }
  //   let readerInfo = this.openedReaders[jslid];
  //   if (!this.openedReaders[jslid]) {
  //     readerInfo = await this.openReader(jslid);
  //   }
  //   readerInfo.isReading = true;
  //   if (!readerInfo.readedSchemaRow) {
  //     await this.readLine(readerInfo); // skip structure
  //   }
  //   while (readerInfo.readedDataRowCount < offset) {
  //     await this.readLine(readerInfo);
  //   }
  //   return readerInfo;
  // },

  async ensureDatastore(jslid, formatterFunction) {
    let datastore = this.datastores[jslid];
    if (!datastore || datastore.formatterFunction != formatterFunction) {
      if (datastore) {
        datastore._closeReader();
      }
      datastore = new JsonLinesDatastore(getJslFileName(jslid), formatterFunction);
      // datastore = new DatastoreProxy(getJslFileName(jslid));
      this.datastores[jslid] = datastore;
    }
    return datastore;
  },

  async closeDataStore(jslid) {
    const datastore = this.datastores[jslid];
    if (datastore) {
      await datastore._closeReader();
      delete this.datastores[jslid];
    }
  },

  getInfo_meta: true,
  async getInfo({ jslid }) {
    const file = getJslFileName(jslid);
    try {
      const firstLine = await readFirstLine(file);
      if (firstLine) {
        const parsed = JSON.parse(firstLine);
        if (parsed.__isStreamHeader) {
          return parsed;
        }
        return {
          __isStreamHeader: true,
          __isDynamicStructure: true,
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  },

  getRows_meta: true,
  async getRows({ jslid, offset, limit, filters, sort, formatterFunction }) {
    const fileName = getJslFileName(jslid);
    if (!fs.existsSync(fileName)) {
      return [];
    }
    const datastore = await this.ensureDatastore(jslid, formatterFunction);
    return datastore.getRows(offset, limit, _.isEmpty(filters) ? null : filters, _.isEmpty(sort) ? null : sort);
  },

  exists_meta: true,
  async exists({ jslid }) {
    const fileName = getJslFileName(jslid);
    return fs.existsSync(fileName);
  },

  streamRows_meta: {
    method: 'get',
    raw: true,
  },
  streamRows(req, res) {
    const { jslid } = req.query;
    if (!jslid) {
      res.status(400).json({ apiErrorMessage: 'Missing jslid' });
      return;
    }

    // Reject file:// jslids — they resolve to arbitrary server-side paths
    if (jslid.startsWith('file://')) {
      res.status(403).json({ apiErrorMessage: 'Forbidden jslid scheme' });
      return;
    }

    const fileName = getJslFileName(jslid);

    // Ensure the resolved path stays within an allowed root directory
    const allowedRoots = [jsldir(), archivedir()].map(r => path.resolve(r) + path.sep);
    const resolvedFile = path.resolve(fileName);
    const isAllowed = allowedRoots.some(root => resolvedFile.startsWith(root));
    if (!isAllowed) {
      logger.warn({ jslid, resolvedFile }, 'DBGM-00000 streamRows rejected path outside allowed roots');
      res.status(403).json({ apiErrorMessage: 'Forbidden path' });
      return;
    }

    if (!fs.existsSync(fileName)) {
      res.status(404).json({ apiErrorMessage: 'File not found' });
      return;
    }
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    const stream = fs.createReadStream(fileName, 'utf-8');

    req.on('close', () => {
      stream.destroy();
    });

    stream.on('error', err => {
      logger.error(extractErrorLogData(err), 'DBGM-00000 Error streaming JSONL file');
      if (!res.headersSent) {
        res.status(500).json({ apiErrorMessage: 'Stream error' });
      } else {
        res.end();
      }
    });

    stream.pipe(res);
  },

  getStats_meta: true,
  getStats({ jslid }) {
    const file = `${getJslFileName(jslid)}.stats`;
    if (fs.existsSync(file)) {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch (e) {
        return {};
      }
    }
    return {};
  },

  loadFieldValues_meta: true,
  async loadFieldValues({ jslid, field, search, formatterFunction }) {
    const datastore = await this.ensureDatastore(jslid, formatterFunction);
    const res = new Set();
    await datastore.enumRows(row => {
      if (!filterName(search, row[field])) return true;
      res.add(row[field]);
      return res.size < 100;
    });
    // @ts-ignore
    return [...res].map(value => ({ value }));
  },

  async notifyChangedStats(stats) {
    // console.log('SENDING STATS', JSON.stringify(stats));
    const datastore = this.datastores[stats.jslid];
    if (datastore) await datastore.notifyChanged();
    socket.emit(`jsldata-stats-${stats.jslid}`, stats);

    // const readerInfo = this.openedReaders[stats.jslid];
    // if (readerInfo && readerInfo.isReading) {
    //   readerInfo.closeAfterReadAndSendStats = stats;
    // } else {
    //   await this.closeReader(stats.jslid);
    //   socket.emit(`jsldata-stats-${stats.jslid}`, stats);
    // }
  },

  saveText_meta: true,
  async saveText({ jslid, text }) {
    await fs.promises.writeFile(getJslFileName(jslid), text);
    return true;
  },

  saveRows_meta: true,
  async saveRows({ jslid, rows }) {
    const fileStream = fs.createWriteStream(getJslFileName(jslid));
    for (const row of rows) {
      await fileStream.write(JSON.stringify(row) + '\n');
    }
    await fileStream.close();
    return true;
  },

  extractTimelineChart_meta: true,
  async extractTimelineChart({ jslid, timestampFunction, aggregateFunction, measures }) {
    const timestamp = requirePluginFunction(timestampFunction);
    const aggregate = requirePluginFunction(aggregateFunction);
    const datastore = new JsonLinesDatastore(getJslFileName(jslid));
    let mints = null;
    let maxts = null;
    // pass 1 - counts stats, time range
    await datastore.enumRows(row => {
      const ts = timestamp(row);
      if (!mints || ts < mints) mints = ts;
      if (!maxts || ts > maxts) maxts = ts;
      return true;
    });
    const minTime = new Date(mints).getTime();
    const maxTime = new Date(maxts).getTime();
    const duration = maxTime - minTime;
    const STEPS = 100;
    let stepCount = duration > 100 * 1000 ? STEPS : Math.round((maxTime - minTime) / 1000);
    if (stepCount < 2) {
      stepCount = 2;
    }
    const stepDuration = duration / stepCount;
    const labels = _.range(stepCount).map(i => new Date(minTime + stepDuration / 2 + stepDuration * i));

    // const datasets = measures.map(m => ({
    //   label: m.label,
    //   data: Array(stepCount).fill(0),
    // }));

    const mproc = measures.map(m => ({
      ...m,
    }));

    const data = Array(stepCount)
      .fill(0)
      .map(() => ({}));

    // pass 2 - count measures
    await datastore.enumRows(row => {
      const ts = timestamp(row);
      let part = Math.round((new Date(ts).getTime() - minTime) / stepDuration);
      if (part < 0) part = 0;
      if (part >= stepCount) part - stepCount - 1;
      if (data[part]) {
        data[part] = aggregate(data[part], row, stepDuration);
      }
      return true;
    });

    datastore._closeReader();

    // const measureByField = _.fromPairs(measures.map((m, i) => [m.field, i]));

    // for (let mindex = 0; mindex < measures.length; mindex++) {
    //   for (let stepIndex = 0; stepIndex < stepCount; stepIndex++) {
    //     const measure = measures[mindex];
    //     if (measure.perSecond) {
    //       datasets[mindex].data[stepIndex] /= stepDuration / 1000;
    //     }
    //     if (measure.perField) {
    //       datasets[mindex].data[stepIndex] /= datasets[measureByField[measure.perField]].data[stepIndex];
    //     }
    //   }
    // }

    // for (let i = 0; i < measures.length; i++) {
    //   if (measures[i].hidden) {
    //     datasets[i] = null;
    //   }
    // }

    return {
      labels,
      datasets: mproc.map(m => ({
        label: m.label,
        data: data.map(d => d[m.field] || 0),
      })),
    };
  },

  downloadJslData_meta: true,
  async downloadJslData({ uri }) {
    const jslid = crypto.randomUUID();
    await dbgateApi.download(uri, { targetFile: getJslFileName(jslid) });
    return { jslid };
  },

  buildChart_meta: true,
  async buildChart({ jslid, definition }) {
    const datastore = new JsonLinesDatastore(getJslFileName(jslid));
    const processor = new ChartProcessor(definition ? [definition] : undefined);
    await datastore.enumRows(row => {
      processor.addRow(row);
      return true;
    });
    processor.finalize();
    return {
      charts: processor.charts,
      columns: processor.availableColumns,
    };
  },
};
