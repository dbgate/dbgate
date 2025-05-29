const _ = require('lodash');
const { splitQuery } = require('dbgate-query-splitter');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const Firebird = require('node-firebird');
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

  async query(dbhan, sql) {
    const res = await new Promise((resolve, reject) => {
      dbhan.client.query(sql, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(result);
      });
    });
    const columns = res?.[0] ? Object.keys(res[0]).map(i => ({ columnName: i })) : [];

    return {
      rows: res ?? [],
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
      logger.error(extractErrorLogData(err), 'Stream error');
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
    if (useTransaction) {
      return this.runSqlInTransaction(dbhan, sql);
    }

    return this.query(dbhan, sql);
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
    return createBulkInsertStream(this, stream, dbhan, name, options);
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

  async runSqlInTransaction() {
    let transactionPromise;
    const sqlItems = splitQuery(sql, driver.sqlSplitterOptions);

    try {
      transactionPromise = await new Promise((resolve, reject) => {
        dbhan.db.transaction(Firebird.ISOLATION_SNAPSHOT, function (err, currentTransaction) {
          if (err) return reject(err);
          resolve(currentTransaction);
        });
      });

      for (let i = 0; i < sqlItems.length; i++) {
        const currentSql = sqlItems[i];

        await new Promise((resolve, reject) => {
          transaction.query(currentSql, function (err, result) {
            if (err) return reject(err);
            resolve(result);
          });
        });
      }

      await new Promise((resolve, reject) => {
        transaction.commit(function (err) {
          if (err) return reject(err);
          resolve();
        });
      });
    } catch (error) {
      if (transactionPromise) {
        await new Promise((resolve, reject) => {
          transactionPromise.rollback(function (rollbackErr) {
            if (rollbackErr) {
              return reject(rollbackErr); // Re-reject the rollback error
            }
            resolve();
          });
        });
      }
    }
  },
};

module.exports = driver;
