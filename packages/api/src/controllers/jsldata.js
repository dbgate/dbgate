const { filterName, getLogger, extractErrorLogData } = require('dbgate-tools');
const logger = getLogger('jsldata');
const { jsldir, archivedir } = require('../utility/directories');
const fs = require('fs');
const path = require('path');
const lineReader = require('line-reader');
const _ = require('lodash');
const { __ } = require('lodash/fp');
const DatastoreCache = require('../utility/DatastoreCache');
const getJslFileName = require('../utility/getJslFileName');
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

    if (!fs.existsSync(fileName)) {
      res.status(404).json({ apiErrorMessage: 'File not found' });
      return;
    }

    // Dereference symlinks and normalize case (Windows) before the allow-list check.
    // realpathSync is safe here because existsSync confirmed the file is present.
    // path.resolve() alone cannot dereference symlinks, so a symlink inside an allowed
    // root could otherwise point to an arbitrary external path.
    const normalize = p => (process.platform === 'win32' ? p.toLowerCase() : p);
    const resolveRoot = r => { try { return fs.realpathSync(r); } catch { return path.resolve(r); } };

    let realFile;
    try {
      realFile = fs.realpathSync(fileName);
    } catch {
      res.status(403).json({ apiErrorMessage: 'Forbidden path' });
      return;
    }

    const allowedRoots = [jsldir(), archivedir()].map(r => normalize(resolveRoot(r)) + path.sep);
    const isAllowed = allowedRoots.some(root => normalize(realFile).startsWith(root));
    if (!isAllowed) {
      logger.warn({ jslid, realFile }, 'DBGM-00255 streamRows rejected path outside allowed roots');
      res.status(403).json({ apiErrorMessage: 'Forbidden path' });
      return;
    }
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    const stream = fs.createReadStream(realFile, 'utf-8');

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
    await dbgateApi.download(uri, { targetFile: getJslFileName(jslid), safeRemoteFetch: true });
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
