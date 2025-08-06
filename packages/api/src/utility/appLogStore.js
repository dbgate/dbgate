const fs = require('fs-extra');
const path = require('path');
const { logsdir } = require('./directories');
const { format, addDays, startOfDay } = require('date-fns');
const LineReader = require('./LineReader');
const socket = require('./socket');
const _ = require('lodash');

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

const RECENT_LOG_LIMIT = 1000;

let recentLogs = null;
const beforeRecentLogs = [];

function adjustRecentLogs() {
  if (recentLogs.length > RECENT_LOG_LIMIT) {
    recentLogs.splice(0, recentLogs.length - RECENT_LOG_LIMIT);
  }
}

function prepareEntryForExport(entry, lastEntry) {
  return {
    date: format(new Date(entry.time), 'yyyy-MM-dd'),
    time: format(new Date(entry.time), 'HH:mm:ss'),
    dtime: lastEntry ? entry.time - lastEntry.time : 0,
    msgcode: entry.msgcode || '',
    message: entry.msg || '',
    ..._.omit(entry, ['time', 'msg', 'msgcode']),
    conid: entry.conid || '',
    database: entry.database || '',
    engine: entry.engine || '',
    ts: entry.time,
  };
}

async function copyAppLogsIntoFile(timeFrom, timeTo, fileName, prepareForExport) {
  const writeStream = fs.createWriteStream(fileName);

  let lastEntry = null;
  for (const file of await getLogFiles(timeFrom, timeTo)) {
    const readStream = fs.createReadStream(file);
    const reader = new LineReader(readStream);
    do {
      const line = await reader.readLine();
      if (line == null) break;
      try {
        const logEntry = JSON.parse(line);
        if (logEntry.time >= timeFrom && logEntry.time <= timeTo) {
          writeStream.write(
            JSON.stringify(prepareForExport ? prepareEntryForExport(logEntry, lastEntry) : logEntry) + '\n'
          );
          lastEntry = logEntry;
        }
      } catch (e) {
        continue;
      }
    } while (true);
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
  initializeRecentLogProvider,
  getRecentAppLogRecords,
  pushToRecentLogs,
  copyAppLogsIntoFile,
};
