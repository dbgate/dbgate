const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const { jsldir } = require('../utility/directories');
const { serializeJsTypesReplacer } = require('dbgate-tools');

class QueryStreamTableWriter {
  constructor(sesid = undefined) {
    this.currentRowCount = 0;
    this.currentChangeIndex = 1;
    this.initializedFile = false;
    this.sesid = sesid;
  }

  initializeFromQuery(structure, resultIndex) {
    this.jslid = crypto.randomUUID();
    this.currentFile = path.join(jsldir(), `${this.jslid}.jsonl`);
    fs.writeFileSync(
      this.currentFile,
      JSON.stringify({
        ...structure,
        __isStreamHeader: true,
      }) + '\n'
    );
    this.currentStream = fs.createWriteStream(this.currentFile, { flags: 'a' });
    this.writeCurrentStats(false, false);
    this.resultIndex = resultIndex;
    this.initializedFile = true;
    process.send({ msgtype: 'recordset', jslid: this.jslid, resultIndex, sesid: this.sesid });
  }

  initializeFromReader(jslid) {
    this.jslid = jslid;
    this.currentFile = path.join(jsldir(), `${this.jslid}.jsonl`);
    this.writeCurrentStats(false, false);
  }

  row(row) {
    // console.log('ACCEPT ROW', row);
    this.currentStream.write(JSON.stringify(row, serializeJsTypesReplacer) + '\n');
    this.currentRowCount += 1;

    if (!this.plannedStats) {
      this.plannedStats = true;
      process.nextTick(() => {
        if (this.currentStream) this.currentStream.uncork();
        process.nextTick(() => this.writeCurrentStats(false, true));
        this.plannedStats = false;
      });
    }
  }

  rowFromReader(row) {
    if (!this.initializedFile) {
      process.send({ msgtype: 'initializeFile', jslid: this.jslid, sesid: this.sesid });
      this.initializedFile = true;

      fs.writeFileSync(this.currentFile, JSON.stringify(row) + '\n');
      this.currentStream = fs.createWriteStream(this.currentFile, { flags: 'a' });
      this.writeCurrentStats(false, false);
      this.initializedFile = true;
      return;
    }

    this.row(row);
  }

  writeCurrentStats(isFinished = false, emitEvent = false) {
    const stats = {
      rowCount: this.currentRowCount,
      changeIndex: this.currentChangeIndex,
      isFinished,
      jslid: this.jslid,
    };
    fs.writeFileSync(`${this.currentFile}.stats`, JSON.stringify(stats));
    this.currentChangeIndex += 1;
    if (emitEvent) {
      process.send({ msgtype: 'stats', sesid: this.sesid, ...stats });
    }
  }

  close(afterClose) {
    if (this.currentStream) {
      this.currentStream.end(() => {
        this.writeCurrentStats(true, true);
        if (afterClose) afterClose();
      });
    }
  }
}

class StreamHandler {
  constructor(queryStreamInfoHolder, resolve, startLine, sesid = undefined) {
    this.recordset = this.recordset.bind(this);
    this.startLine = startLine;
    this.sesid = sesid;
    this.row = this.row.bind(this);
    // this.error = this.error.bind(this);
    this.done = this.done.bind(this);
    this.info = this.info.bind(this);

    // use this for cancelling - not implemented
    // this.stream = null;

    this.plannedStats = false;
    this.queryStreamInfoHolder = queryStreamInfoHolder;
    this.resolve = resolve;
    // currentHandlers = [...currentHandlers, this];
  }

  closeCurrentWriter() {
    if (this.currentWriter) {
      this.currentWriter.close();
      this.currentWriter = null;
    }
  }

  recordset(columns) {
    this.closeCurrentWriter();
    this.currentWriter = new QueryStreamTableWriter(this.sesid);
    this.currentWriter.initializeFromQuery(
      Array.isArray(columns) ? { columns } : columns,
      this.queryStreamInfoHolder.resultIndex
    );
    this.queryStreamInfoHolder.resultIndex += 1;

    // this.writeCurrentStats();

    // this.onRow = _.throttle((jslid) => {
    //   if (jslid == this.jslid) {
    //     this.writeCurrentStats(false, true);
    //   }
    // }, 500);
  }
  row(row) {
    if (this.currentWriter) this.currentWriter.row(row);
    else if (row.message) process.send({ msgtype: 'info', info: { message: row.message }, sesid: this.sesid });
    // this.onRow(this.jslid);
  }
  // error(error) {
  //   process.send({ msgtype: 'error', error });
  // }
  done(result) {
    this.closeCurrentWriter();
    // currentHandlers = currentHandlers.filter((x) => x != this);
    this.resolve();
  }
  info(info) {
    if (info && info.line != null) {
      info = {
        ...info,
        line: this.startLine + info.line,
      };
    }
    if (info.severity == 'error') {
      this.queryStreamInfoHolder.canceled = true;
    }
    process.send({ msgtype: 'info', info, sesid: this.sesid });
  }
}

function handleQueryStream(dbhan, driver, queryStreamInfoHolder, sqlItem, sesid = undefined) {
  return new Promise((resolve, reject) => {
    const start = sqlItem.trimStart || sqlItem.start;
    const handler = new StreamHandler(queryStreamInfoHolder, resolve, start && start.line, sesid);
    driver.stream(dbhan, sqlItem.text, handler);
  });
}

function allowExecuteCustomScript(storedConnection, driver) {
  if (driver.readOnlySessions) {
    return true;
  }
  if (storedConnection.isReadOnly) {
    return false;
    // throw new Error('Connection is read only');
  }
  return true;
}

module.exports = {
  handleQueryStream,
  QueryStreamTableWriter,
  allowExecuteCustomScript,
};
