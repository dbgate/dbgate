const _ = require('lodash');
const stream = require('stream');
const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const cassandra = require('cassandra-driver');
const createCassandraBulkInsertStream = require('./createBulkInsertStream.js');
const { makeUniqueColumnNames } = require('dbgate-tools');

function getTypeName(code) {
  return Object.keys(cassandra.types.dataTypes).find((key) => cassandra.types.dataTypes[key] === code);
}

function extractLineFromError(err) {
  const match = err.message.match(/line (\d+):(\d+)/);
  if (!match) return {};

  const line = parseInt(match[1], 10) - 1;
  const col = parseInt(match[2], 10);
  return { line, col };
}

function zipDataRow(row, header) {
  const zippedRow = {};

  for (let i = 0; i < header.length; i++) {
    zippedRow[header[i].columnName] = row.get(i);
  }

  return zippedRow;
}

function extractCassandraColumns(row) {
  if (!row) return [];

  const columns = row.__columns.map((column) => ({ columnName: column.name }));
  makeUniqueColumnNames(columns);

  return columns;
}

/** @type {import('dbgate-types').EngineDriver<cassandra.Client>} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,
  // creating connection
  async connect({ server, user, password, database, localDataCenter, useDatabaseUrl, databaseUrl }) {
    let credentials;
    
    if (user && password) {
      credentials = {
        username: user,
        password,
      }
    } 

    const client = new cassandra.Client({
      credentials,
      contactPoints: server.split(','),
      localDataCenter: localDataCenter ?? this.defaultLocalDataCenter,
      keyspace: database,
    });

    client.connect();

    return {
      client,
      database,
    };
  },

  // called for retrieve data (eg. browse in data grid) and for update database
  async query(dbhan, query, options) {
    const offset = options?.range?.offset;
    if (options?.discardResult) {
      await dbhan.client.execute(query);
      return {
        rows: [],
        columns: [],
      };
    }
    const result = await dbhan.client.execute(query);
    if (!result.rows?.[0]) {
      return {
        rows: [],
        columns: [],
      };
    }

    const columns = result.columns.map(({ name, type: { code } }) => ({
      columnName: name,
      dataType: getTypeName(code),
    }));

    return {
      rows: offset ? result.rows.slice(offset) : result.rows,
      columns,
    };
  },
  // called in query console
  async stream(dbhan, query, options) {
    try {
      if (!query.match(/^\s*SELECT/i)) {
        await dbhan.client.execute(query);
        options.done();
        return;
      }

      const strm = dbhan.client.stream(query);

      let header;

      strm.on('readable', () => {
        let row;
        while ((row = strm.read())) {
          if (!header) {
            header = extractCassandraColumns(row);
            options.recordset(header);
          }
          options.row(zipDataRow(row, header));
        }
      });

      strm.on('end', () => {
        options.done();
      });

      strm.on('error', (err) => {
        const { line } = extractLineFromError(err);

        options.info({
          message: err.toString(),
          time: new Date(),
          severity: 'error',
          line,
        });
        options.done();
      });
    } catch (err) {
      const { line } = extractLineFromError(err);

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
  async readQuery(dbhan, query, structure) {
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    const strm = dbhan.client.stream(query);

    strm.on('readable', () => {
      let row;
      while ((row = strm.read())) {
        pass.write(row);
      }
    });

    strm.on('end', () => {
      pass.end();
    });

    strm.on('error', (err) => {
      const { line } = extractLineFromError(err);

      pass.info({
        message: err.toString(),
        time: new Date(),
        severity: 'error',
        line,
      });
      pass.end();
    });

    return pass;
  },
  async writeTable(dbhan, name, options) {
    return createCassandraBulkInsertStream(this, stream, dbhan, name, options);
  },
  // detect server version
  async getVersion(dbhan) {
    const result = await dbhan.client.execute('SELECT release_version from system.local');
    return { version: result.rows[0].release_version };
  },
  // list databases on server
  async listDatabases(dbhan) {
    const result = await dbhan.client.execute('SELECT keyspace_name FROM system_schema.keyspaces');
    return result.rows.map((row) => ({ name: row.keyspace_name }));
  },

  async close(dbhan) {
    return dbhan.client.shutdown();
  },
};

module.exports = driver;
