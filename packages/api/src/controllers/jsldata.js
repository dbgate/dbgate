const { filterName, getLogger, extractErrorLogData } = require('dbgate-tools');
const logger = getLogger('jsldata');
const fs = require('fs');
const lineReader = require('line-reader');
const _ = require('lodash');
const { __ } = require('lodash/fp');
const DatastoreCache = require('../utility/DatastoreCache');
const getJslFileName = require('../utility/getJslFileName');
const { openJslFileForWrite, openJslFileForRead } = getJslFileName;
const JsonLinesDatastore = require('../utility/JsonLinesDatastore');
const requirePluginFunction = require('../utility/requirePluginFunction');
const socket = require('../utility/socket');
const crypto = require('crypto');
const dbgateApi = require('../shell');
const { ChartProcessor } = require('dbgate-datalib');

const datastoreCache = new DatastoreCache(
  (jslid, formatterFunction) => new JsonLinesDatastore(getJslFileName(jslid), formatterFunction),
  err => logger.error(extractErrorLogData(err), 'DBGM-00000 Error closing cached result reader')
);

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
  async closeDataStore(jslid) {
    await datastoreCache.close(jslid);
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
    return datastoreCache.use(jslid, formatterFunction, datastore =>
      datastore.getRows(offset, limit, _.isEmpty(filters) ? null : filters, _.isEmpty(sort) ? null : sort)
    );
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
  async streamRows(req, res) {
    const { jslid } = req.query;
    if (!jslid) {
      res.status(400).json({ apiErrorMessage: 'Missing jslid' });
      return;
    }

    // getJslFileName confines the resolved path to the managed data directories for every
    // jslid form, so this route no longer needs an allow-list check of its own - having one
    // here and nowhere else is how the write routes below ended up unprotected.
    //
    // The stream is then built on the descriptor openJslFileForRead vouched for, not on the
    // path. Handing the approved name back to createReadStream would read whatever that name
    // resolves to by the time the stream opens it, which is not what was approved.
    let handle;
    try {
      handle = await openJslFileForRead(jslid);
    } catch (err) {
      if (err?.code == 'ENOENT') {
        res.status(404).json({ apiErrorMessage: 'File not found' });
        return;
      }
      logger.warn({ jslid }, 'DBGM-00255 streamRows rejected path outside allowed roots');
      res.status(403).json({ apiErrorMessage: 'Forbidden path' });
      return;
    }

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    const stream = fs.createReadStream(null, { fd: handle.fd, encoding: 'utf-8', autoClose: false });

    const closeHandle = () => handle.close().catch(() => {});
    stream.on('close', closeHandle);

    req.on('close', () => {
      stream.destroy();
    });

    stream.on('error', err => {
      logger.error(extractErrorLogData(err), 'DBGM-00256 Error streaming JSONL file');
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
    const res = new Set();
    await datastoreCache.use(jslid, formatterFunction, datastore =>
      datastore.enumRows(row => {
        if (!filterName(search, row[field])) return true;
        res.add(row[field]);
        return res.size < 100;
      })
    );
    // @ts-ignore
    return [...res].map(value => ({ value }));
  },

  async notifyChangedStats(stats) {
    await datastoreCache.use(stats.jslid, undefined, datastore => datastore.notifyChanged(), true);
    socket.emit(`jsldata-stats-${stats.jslid}`, stats);
  },

  saveText_meta: true,
  async saveText({ jslid, text }) {
    // openJslFileForWrite rather than a plain writeFile: getJslFileName settles where the jslid
    // points, the no-follow open settles what is actually written to
    const handle = await openJslFileForWrite(jslid);
    try {
      await handle.writeFile(text);
    } finally {
      await handle.close();
    }
    return true;
  },

  saveRows_meta: true,
  async saveRows({ jslid, rows }) {
    const handle = await openJslFileForWrite(jslid);
    try {
      for (const row of rows) {
        await handle.write(JSON.stringify(row) + '\n');
      }
    } finally {
      await handle.close();
    }
    return true;
  },

  extractTimelineChart_meta: true,
  async extractTimelineChart({ jslid, timestampFunction, aggregateFunction, measures }) {
    const timestamp = requirePluginFunction(timestampFunction);
    const aggregate = requirePluginFunction(aggregateFunction);
    const datastore = new JsonLinesDatastore(getJslFileName(jslid));
    try {
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
    } finally {
      await datastore.dispose();
    }
  },

  downloadJslData_meta: true,
  async downloadJslData({ uri }) {
    const jslid = crypto.randomUUID();
    await dbgateApi.download(uri, { targetFile: getJslFileName(jslid), safeRemoteFetch: true });
    return { jslid };
  },

  buildChart_meta: true,
  async buildChart({ jslid, definition }) {
    const datastore = new JsonLinesDatastore(getJslFileName(jslid));
    const processor = new ChartProcessor(definition ? [definition] : undefined);
    try {
      await datastore.enumRows(row => {
        processor.addRow(row);
        return true;
      });
    } finally {
      await datastore.dispose();
    }
    processor.finalize();
    return {
      charts: processor.charts,
      columns: processor.availableColumns,
    };
  },
};
