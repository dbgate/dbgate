const fs = require('fs-extra');
const path = require('path');
const { logsdir } = require('./directories');
const { format, addDays, startOfDay } = require('date-fns');
const JsonLinesDatastore = require('./JsonLinesDatastore');
const LineReader = require('./LineReader');
const socket = require('./socket');

async function getLogFiles(timeFrom, timeTo) {
  const dir = logsdir();
  const files = await fs.readdir(dir);
  const startPrefix = format(timeFrom, 'yyyy-MM-dd');
  const endPrefix = format(addDays(timeTo, 1), 'yyyy-MM-dd');
  const logFiles = files
    .filter(file => file.endsWith('.ndjson'))
    .filter(file => file >= startPrefix && file < endPrefix);
  return logFiles.sort().map(x => path.join(dir, x));
}

class AppLogDatastore {
  constructor({ timeFrom, timeTo }) {
    this.timeFrom = timeFrom;
    this.timeTo = timeTo;
  }

  async resolveNextFile(file) {
    const files = await getLogFiles(this.timeFrom, this.timeTo);
    const index = files.indexOf(file);
    if (index < 0 || index >= files.length - 1) return null;
    return files[index + 1];
  }

  async getRows(offset = 0, limit = 100, filters = {}) {
    if (!this.linesReader) {
      const files = await getLogFiles(this.timeFrom, this.timeTo);
      this.linesReader = new JsonLinesDatastore(files[0], null, file => this.resolveNextFile(file));
    }

    const conditions = [
      {
        conditionType: 'binary',
        operator: '>=',
        left: { exprType: 'column', columnName: 'time' },
        right: { exprType: 'value', value: this.timeFrom },
      },
      {
        conditionType: 'binary',
        operator: '<=',
        left: { exprType: 'column', columnName: 'time' },
        right: { exprType: 'value', value: this.timeTo },
      },
    ];
    for (const [key, values] of Object.entries(filters)) {
      if (values.length == 1 && values[0] == null) {
        // @ts-ignore
        conditions.push({
          conditionType: 'isNull',
          expr: { exprType: 'column', columnName: key },
        });
        continue;
      }
      // @ts-ignore
      conditions.push({
        conditionType: 'in',
        expr: { exprType: 'column', columnName: key },
        values,
      });
    }

    return this.linesReader.getRows(
      offset,
      limit,
      {
        conditionType: 'and',
        conditions,
      },
      null
    );
  }

  _closeReader() {
    if (this.linesReader) {
      this.linesReader._closeReader();
      this.linesReader = null;
    }
  }
}

const RECENT_LOG_LIMIT = 1000;

let recentLogs = null;
const beforeRecentLogs = [];

function adjustRecentLogs() {
  if (recentLogs.length > RECENT_LOG_LIMIT) {
    recentLogs.splice(0, recentLogs.length - RECENT_LOG_LIMIT);
  }
}

async function initializeRecentLogProvider() {
  const logs = [];
  for (const file of await getLogFiles(startOfDay(new Date()), new Date())) {
    const fileStream = fs.createReadStream(file);
    const reader = new LineReader(fileStream);
    do {
      const line = await reader.readLine();
      if (line == null) break;
      try {
        const logEntry = JSON.parse(line);
        logs.push(logEntry);
        if (logs.length > RECENT_LOG_LIMIT) {
          logs.shift();
        }
      } catch (e) {
        continue;
      }
    } while (true);
  }
  recentLogs = logs;
  recentLogs.push(...beforeRecentLogs);
}

let counter = 0;
function pushToRecentLogs(msg) {
  const finalMsg = {
    ...msg,
    counter,
  };
  counter += 1;
  if (recentLogs) {
    recentLogs.push(finalMsg);
    adjustRecentLogs();
    socket.emit('applog-event', finalMsg);
  } else {
    beforeRecentLogs.push(finalMsg);
  }
}

function getRecentAppLogRecords() {
  return recentLogs ?? beforeRecentLogs;
}

module.exports = {
  AppLogDatastore,
  initializeRecentLogProvider,
  getRecentAppLogRecords,
  pushToRecentLogs,
};
