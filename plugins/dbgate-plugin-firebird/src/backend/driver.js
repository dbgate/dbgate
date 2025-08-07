const _ = require('lodash');
const { splitQuery } = require('dbgate-query-splitter');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const Firebird = require('node-firebird');
const { normalizeRow, createFirebirdInsertStream } = require('./helpers');
const { getLogger, extractErrorLogData, createBulkInsertStreamBase } = require('dbgate-tools');
const sql = require('./sql');

const logger = getLogger('firebird');

/** @type {import('dbgate-types').EngineDriver<Firebird.Database>} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  async connect({ port, user, password, server, databaseFile }) {
    const options = {
      host: server,
      port,
      database: databaseFile,
      user,
      password,
    };

    /**@type {Firebird.Database} */
    const db = await new Promise((resolve, reject) => {
      Firebird.attachOrCreate(options, (err, db) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(db);
      });
    });

    return {
      client: db,
    };
  },

  async query(dbhan, sql, { discardResult } = {}) {
    const res = await new Promise((resolve, reject) => {
      dbhan.client.query(sql, (err, result) => {
        if (err) {
          reject(err);
          console.error(err);
          console.error('Executing query:', sql);
          return;
        }

        resolve(result);
      });
    });

    if (discardResult) {
      return {
        rows: [],
        columns: [],
      };
    }

    const columns = res?.[0] ? Object.keys(res[0]).map(i => ({ columnName: i })) : [];

    return {
      rows: res ? await Promise.all(res.map(normalizeRow)) : [],
      columns,
    };
  },

  async stream(dbhan, sql, options) {
    try {
      await new Promise((resolve, reject) => {
        let hasSentColumns = false;
        dbhan.client.sequentially(
          sql,
          [],
          (row, index) => {
            if (!hasSentColumns) {
              hasSentColumns = true;
              const columns = Object.keys(row).map(i => ({ columnName: i }));
              options.recordset(columns);
            }

            options.row(row);
          },
          err => {
            if (err) {
              reject(err);
              return;
            }

            resolve();
          }
        );
      });

      options.done();
    } catch (err) {
      logger.error(extractErrorLogData(err), 'DBGM-00190 Stream error');
      options.info({
        message: err.message,
        line: err.line,
        // procedure: procName,
        time: new Date(),
        severity: 'error',
      });
      options.done();
    }
  },

  async script(dbhan, sql, { useTransaction } = {}) {
    if (useTransaction) return this.runSqlInTransaction(dbhan, sql);

    const sqlItems = splitQuery(sql, driver.sqlSplitterOptions);
    for (const sqlItem of sqlItems) {
      await this.query(dbhan, sqlItem, { discardResult: true });
    }
  },

  async readQuery(dbhan, sql, structure) {
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });
    let hasSentColumns = false;

    dbhan.client.sequentially(
      sql,
      [],
      (row, index) => {
        if (!hasSentColumns) {
          hasSentColumns = true;

          const columns = Object.keys(row).map(i => ({ columnName: i }));

          pass.write({
            __isStreamHeader: true,
            ...(structure || { columns }),
          });
        }

        pass.write(row);
      },
      err => {
        pass.end();
      }
    );

    return pass;
  },

  async writeTable(dbhan, name, options) {
    return createFirebirdInsertStream(this, stream, dbhan, name, options);
  },

  async getVersion(dbhan) {
    const res = await this.query(dbhan, sql.version);
    const version = res.rows?.[0]?.VERSION;

    return {
      version,
      versionText: `Firebird ${version}`,
    };
  },

  async close(dbhan) {
    return new Promise((resolve, reject) => {
      dbhan.client.detach(err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  },

  /**
   * @param {import('dbgate-types').DatabaseHandle<Firebird.Database>} dbhan
   * @param {string} sql
   */
  async runSqlInTransaction(dbhan, sql) {
    /** @type {Firebird.Transaction} */
    let transactionPromise;
    const sqlItems = splitQuery(sql, driver.sqlSplitterOptions);

    try {
      transactionPromise = await new Promise((resolve, reject) => {
        dbhan.client.transaction(Firebird.ISOLATION_SNAPSHOT, function (err, currentTransaction) {
          if (err) return reject(err);
          resolve(currentTransaction);
        });
      });

      for (let i = 0; i < sqlItems.length; i++) {
        const currentSql = sqlItems[i];

        await new Promise((resolve, reject) => {
          transactionPromise.query(currentSql, function (err, result) {
            if (err) {
              logger.error(extractErrorLogData(err), 'DBGM-00191 Error executing SQL in transaction');
              logger.error({ sql: currentSql }, 'DBGM-00192 SQL that caused the error');
              return reject(err);
            }
            resolve(result);
          });
        });
      }

      await new Promise((resolve, reject) => {
        transactionPromise.commit(function (err) {
          if (err) {
            logger.error(extractErrorLogData(err), 'DBGM-00193 Error committing transaction');
            return reject(err);
          }
          resolve();
        });
      });
    } catch (error) {
      logger.error(extractErrorLogData(error), 'DBGM-00194 Transaction error');
      if (transactionPromise) {
        await new Promise((resolve, reject) => {
          transactionPromise.rollback(function (rollbackErr) {
            if (rollbackErr) {
              logger.error(extractErrorLogData(rollbackErr), 'DBGM-00195 Error rolling back transaction');
              return reject(rollbackErr); // Re-reject the rollback error
            }
            resolve();
          });
        });
      }
    }

    return transactionPromise;
  },
};

module.exports = driver;
