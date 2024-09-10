const _ = require('lodash');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const { createClient } = require('@clickhouse/client');

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
      database: database,
    });

    client._database_name = database;
    return client;
  },
  // called for retrieve data (eg. browse in data grid) and for update database
  async query(client, query) {
    const resultSet = await client.query({
      query,
      format: 'JSONCompactEachRowWithNamesAndTypes',
    });

    const dataSet = await resultSet.json();

    const columns = dataSet[0].map((columnName, i) => ({
      columnName,
      dataType: dataSet[1][i],
    }));

    return {
      rows: dataSet.slice(2).map((row) => _.zipObject(dataSet[0], row)),
      columns,
    };
  },
  // called in query console
  async stream(client, query, options) {
    try {
      const resultSet = await client.query({
        query,
        format: 'JSONCompactEachRowWithNamesAndTypes',
      });

      let columnNames = null;
      let dataTypes = null;

      const stream = resultSet.stream();

      stream.on('data', (rows) => {
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

      stream.on('end', () => {
        options.done();
      });

      stream.on('error', (err) => {
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
  async readQuery(connection, sql, structure) {
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    // pass.write(structure)
    // pass.write(row1)
    // pass.write(row2)
    // pass.end()

    return pass;
  },
  // called when importing into table or view
  async writeTable(connection, name, options) {
    return createBulkInsertStreamBase(this, stream, pool, name, options);
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
};

module.exports = driver;
