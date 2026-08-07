const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const { jsldir } = require('../utility/directories');
const { serializeJsTypesReplacer, getLogger } = require('dbgate-tools');
const { ChartProcessor } = require('dbgate-datalib');
const { isProApp } = require('./checkLicense');
const { enrichQueryResultColumns } = require('./queryResultMetadata');

const logger = getLogger('handleQueryStream');

class QueryStreamTableWriter {
  constructor(sesid = undefined) {
    this.currentRowCount = 0;
    this.currentChangeIndex = 1;
    this.initializedFile = false;
    this.sesid = sesid;
    this.started = new Date().getTime();
  }

  initializeFromQuery(structure, resultIndex, chartDefinition, autoDetectCharts = false, options = {}) {
    this.jslid = crypto.randomUUID();
    this.currentFile = path.join(jsldir(), `${this.jslid}.jsonl`);
    fs.writeFileSync(
      this.currentFile,
      JSON.stringify({
        ...structure,
        __isStreamHeader: true,
        ...options
      }) + '\n'
    );
    this.currentStream = fs.createWriteStream(this.currentFile, { flags: 'a' });
    this.writeCurrentStats(false, false);
    this.resultIndex = resultIndex;
    this.initializedFile = true;
    if (isProApp() && (chartDefinition || autoDetectCharts)) {
      this.chartProcessor = chartDefinition ? new ChartProcessor([chartDefinition]) : new ChartProcessor();
    }
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
    try {
      if (this.chartProcessor) {
        this.chartProcessor.addRow(row);
      }
    } catch (e) {
      console.error('Error processing chart row', e);
      this.chartProcessor = null;
    }

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
    return new Promise(resolve => {
      if (this.currentStream) {
        this.currentStream.end(() => {
          this.writeCurrentStats(true, true);
          if (afterClose) afterClose();
          if (this.chartProcessor) {
            try {
              this.chartProcessor.finalize();
              if (isProApp() && this.chartProcessor.charts.length > 0) {
                process.send({
                  msgtype: 'charts',
                  sesid: this.sesid,
                  jslid: this.jslid,
                  charts: this.chartProcessor.charts,
                  resultIndex: this.resultIndex,
                });
              }
            } catch (e) {
              console.error('Error finalizing chart processor', e);
              this.chartProcessor = null;
            }
          }
          process.send({
            msgtype: 'endrecordset',
            jslid: this.jslid,
            rowCount: this.currentRowCount,
            sesid: this.sesid,
            durationMs: new Date().getTime() - this.started,
          });
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

class StreamHandler {
  constructor(
    queryStreamInfoHolder,
    resolve,
    startLine,
    sesid = undefined,
    limitRows = undefined,
    frontMatter = undefined,
    autoDetectCharts = false,
    supportsEditableQueryResults = false,
    dbhan = null,
    driver = null,
    dbinfo = null
  ) {
    this.recordset = this.recordset.bind(this);
    this.startLine = startLine;
    this.sesid = sesid;
    this.frontMatter = frontMatter;
    this.autoDetectCharts = autoDetectCharts;
    this.supportsEditableQueryResults = supportsEditableQueryResults;
    this.dbhan = dbhan;
    this.driver = driver;
    this.dbinfo = dbinfo;
    this.limitRows = limitRows;
    this.rowsLimitOverflow = false;
    this.row = this.row.bind(this);
    // this.error = this.error.bind(this);
    this.done = this.done.bind(this);
    this.info = this.info.bind(this);
    this.changedCurrentDatabase = this.changedCurrentDatabase.bind(this);

    // use this for cancelling - not implemented
    // this.stream = null;

    this.plannedStats = false;
    this.queryStreamInfoHolder = queryStreamInfoHolder;
    this.resolve = resolve;
    this.currentRecordset = null;
    this.recordsetQueuePromise = Promise.resolve();
    // currentHandlers = [...currentHandlers, this];
  }

  closeCurrentWriter() {
    if (this.currentWriter) {
      this.currentWriter.close();
      this.currentWriter = null;
    }
  }

  changedCurrentDatabase(database) {
    process.send({ msgtype: 'changedCurrentDatabase', database, sesid: this.sesid });
  }

  async prepareRecordset(recordsetContext, columns, options) {
    if (this.rowsLimitOverflow) {
      return;
    }
    this.closeCurrentWriter();
    const writer = new QueryStreamTableWriter(this.sesid);
    const structure = Array.isArray(columns) ? { columns } : columns;
    const enrichedColumns = await enrichQueryStreamColumns(
      structure?.columns,
      this.sql,
      this.supportsEditableQueryResults,
      this.driver,
      this.dbhan,
      this.dbinfo
    );
    writer.initializeFromQuery(
      {
        ...structure,
        columns: enrichedColumns,
      },
      recordsetContext.resultIndex,
      this.frontMatter?.[`chart-${recordsetContext.resultIndex + 1}`],
      this.autoDetectCharts,
      options
    );
    recordsetContext.writer = writer;
    this.currentWriter = writer;
    for (const row of recordsetContext.pendingRows) {
      this.writeRow(recordsetContext, row, false);
    }
    recordsetContext.pendingRows = [];

    // this.writeCurrentStats();

    // this.onRow = _.throttle((jslid) => {
    //   if (jslid == this.jslid) {
    //     this.writeCurrentStats(false, true);
    //   }
    // }, 500);
  }

  recordset(columns, options) {
    const recordsetContext = {
      pendingRows: [],
      resultIndex: this.queryStreamInfoHolder.resultIndex,
      rowCounter: 0,
      writer: null,
    };
    this.queryStreamInfoHolder.resultIndex += 1;
    this.currentRecordset = recordsetContext;

    const recordsetReadyPromise = this.recordsetQueuePromise
      .then(() => this.prepareRecordset(recordsetContext, columns, options))
      .catch(err => {
        recordsetContext.pendingRows = [];
        this.info({
          message: err?.message || `${err}`,
          severity: 'error',
        });
      })
      .finally(() => {
        if (this.recordsetReadyPromise == recordsetReadyPromise) {
          this.recordsetReadyPromise = null;
        }
      });
    this.recordsetReadyPromise = recordsetReadyPromise;
    this.recordsetQueuePromise = recordsetReadyPromise;
  }

  writeRow(recordsetContext, row, incrementCounter = true) {
    recordsetContext.writer.row(row);
    if (incrementCounter) recordsetContext.rowCounter += 1;
  }

  row(row) {
    if (this.rowsLimitOverflow) {
      return;
    }

    const recordsetContext = this.currentRecordset;
    if (this.limitRows && recordsetContext?.rowCounter >= this.limitRows) {
      process.send({
        msgtype: 'info',
        info: { message: `Rows limit overflow, loaded ${recordsetContext.rowCounter} rows, canceling query`, severity: 'error' },
        sesid: this.sesid,
      });
      this.rowsLimitOverflow = true;

      this.queryStreamInfoHolder.canceled = true;
      if (this.currentWriter) {
        this.currentWriter.close().then(() => {
          process.exit(0);
        });
      } else {
        process.exit(0);
      }

      return;
    }

    if (recordsetContext?.writer) {
      this.writeRow(recordsetContext, row);
    } else if (recordsetContext) {
      recordsetContext.pendingRows.push(row);
      recordsetContext.rowCounter += 1;
    } else if (row.message) {
      process.send({ msgtype: 'info', info: { message: row.message }, sesid: this.sesid });
    }
    // this.onRow(this.jslid);
  }
  // error(error) {
  //   process.send({ msgtype: 'error', error });
  // }
  done(result) {
    const finish = () => {
      this.closeCurrentWriter();
      // currentHandlers = currentHandlers.filter((x) => x != this);
      this.resolve();
    };
    this.recordsetQueuePromise.then(finish);
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

async function enrichQueryStreamColumns(columns, sql, supportsEditableQueryResults, driver, dbhan, dbinfo) {
  if (!supportsEditableQueryResults) return columns;
  return enrichQueryResultColumns({
    columns,
    sql,
    driver,
    dbhan,
    dbinfo,
    onNativeMetadataError: err => logger.warn('Error enriching query stream columns', err),
    onFallbackMetadataError: err => logger.warn('Error parsing query stream column metadata', err),
  });
}

function handleQueryStream(
  dbhan,
  driver,
  queryStreamInfoHolder,
  sqlItem,
  sesid = undefined,
  limitRows = undefined,
  frontMatter = undefined,
  autoDetectCharts = false,
  dbinfo = null
) {
  return new Promise((resolve, reject) => {
    const start = sqlItem.trimStart || sqlItem.start;
    const handler = new StreamHandler(
      queryStreamInfoHolder,
      resolve,
      start && start.line,
      sesid,
      limitRows,
      frontMatter,
      autoDetectCharts,
      driver.databaseEngineTypes?.includes('sql') && driver.supportsEditableQueryResults,
      dbhan,
      driver,
      dbinfo
    );
    handler.sql = sqlItem.text;
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
