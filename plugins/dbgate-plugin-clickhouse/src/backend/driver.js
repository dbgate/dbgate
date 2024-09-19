const _ = require('lodash');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const { createClient } = require('@clickhouse/client');
const createBulkInsertStream = require('./createBulkInsertStream');


/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  // creating connection
  async connect({ server, port, user, password, database, useDatabaseUrl, databaseUrl }) {
    const client = createClient({
      url: databaseUrl,
      username: user,
      password: password,
      database,
    });

    client.__dbgate_database_name__ = database;
    return client;
  },
  // called for retrieve data (eg. browse in data grid) and for update database
  async query(client, query, options) {
    if (options?.discardResult) {
      await client.command({
        query,
      });
      return {
        rows: [],
        columns: [],
      };
    } else {
      const resultSet = await client.query({
        query,
        format: 'JSONCompactEachRowWithNamesAndTypes',
      });

      const dataSet = await resultSet.json();
      if (!dataSet?.[0]) {
        return {
          rows: [],
          columns: [],
        };
      }

      const columns = dataSet[0].map((columnName, i) => ({
        columnName,
        dataType: dataSet[1][i],
      }));

      return {
        rows: dataSet.slice(2).map((row) => _.zipObject(dataSet[0], row)),
        columns,
      };
    }
  },
  // called in query console
  async stream(client, query, options) {
    try {
      if (!query.match(/^\s*SELECT/i)) {
        const resp = await client.command({
          query,
        });
        // console.log('RESP', resp);
        // const { rowsAffected } = resp || {};
        // if (rowsAffected) {
        //   options.info({
        //     message: `${rowsAffected} rows affected`,
        //     time: new Date(),
        //     severity: 'info',
        //   });
        // }
        options.done();
        return;
      }

      const resultSet = await client.query({
        query,
        format: 'JSONCompactEachRowWithNamesAndTypes',
      });

      let columnNames = null;
      let dataTypes = null;

      const strm = resultSet.stream();

      strm.on('data', (rows) => {
        rows.forEach((row) => {
          const json = row.json();
          if (!columnNames) {
            columnNames = json;
            return;
          }
          if (!dataTypes) {
            dataTypes = json;

            const columns = columnNames.map((columnName, i) => ({
              columnName,
              dataType: dataTypes[i],
            }));

            options.recordset(columns);
            return;
          }
          const data = _.zipObject(columnNames, json);
          options.row(data);
        });
      });

      strm.on('end', () => {
        options.done();
      });

      strm.on('error', (err) => {
        options.info({
          message: err.toString(),
          time: new Date(),
          severity: 'error',
        });
        options.done();
      });
    } catch (err) {
      const mLine = err.message.match(/\(line (\d+)\,/);
      let line = undefined;
      if (mLine) {
        line = parseInt(mLine[1]) - 1;
      }

      options.info({
        message: err.message,
        time: new Date(),
        severity: 'error',
        line,
      });
      options.done();
    }
  },
  // called when exporting table or view
  async readQuery(client, query, structure) {
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    const resultSet = await client.query({
      query,
      format: 'JSONCompactEachRowWithNamesAndTypes',
    });

    let columnNames = null;
    let dataTypes = null;

    const strm = resultSet.stream();

    strm.on('data', (rows) => {
      rows.forEach((row) => {
        const json = row.json();
        if (!columnNames) {
          columnNames = json;
          return;
        }
        if (!dataTypes) {
          dataTypes = json;

          const columns = columnNames.map((columnName, i) => ({
            columnName,
            dataType: dataTypes[i],
          }));

          pass.write({
            __isStreamHeader: true,
            ...(structure || { columns }),
          });
          return;
        }
        const data = _.zipObject(columnNames, json);
        pass.write(data);
      });
    });

    strm.on('end', () => {
      pass.end();
    });

    strm.on('error', (err) => {
      pass.end();
    });

    return pass;
  },
  async writeTable(pool, name, options) {
    return createBulkInsertStream(this, stream, pool, name, options);
  },
  // detect server version
  async getVersion(client) {
    const resultSet = await client.query({
      query: 'SELECT version() as version',
      format: 'JSONEachRow',
    });
    const dataset = await resultSet.json();
    return { version: dataset[0].version };
  },
  // list databases on server
  async listDatabases(client) {
    const resultSet = await client.query({
      query: `SELECT name
              FROM system.databases
              WHERE name NOT IN ('system', 'information_schema', 'information_schema_ro', 'INFORMATION_SCHEMA')`,
      format: 'JSONEachRow',
    });
    const dataset = await resultSet.json();
    return dataset;
  },

  async close(client) {
    return client.close();
  },
};

module.exports = driver;
