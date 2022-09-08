const _ = require('lodash');
const stream = require('stream');
const driverBases = require('../frontend/drivers');
const Analyser = require('./Analyser');
const mysql2 = require('mysql2');
const { createBulkInsertStreamBase, makeUniqueColumnNames } = require('dbgate-tools');
const { MySqlDumper } = require('antares-mysql-dumper');

function extractColumns(fields) {
  if (fields) {
    const res = fields.map(col => ({
      columnName: col.name,
    }));
    makeUniqueColumnNames(res);
    return res;
  }
  return null;
}

function zipDataRow(rowArray, columns) {
  return _.zipObject(
    columns.map(x => x.columnName),
    rowArray
  );
}

/** @type {import('dbgate-types').EngineDriver} */
const drivers = driverBases.map(driverBase => ({
  ...driverBase,
  analyserClass: Analyser,

  async connect({ server, port, user, password, database, ssl, isReadOnly, forceRowsAsObjects, socketPath, authType }) {
    const options = {
      host: authType == 'socket' ? null : server,
      port: authType == 'socket' ? null : port,
      socketPath: authType == 'socket' ? socketPath || driverBase.defaultSocketPath : null,
      user,
      password,
      database,
      ssl,
      rowsAsArray: forceRowsAsObjects ? false : true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
      // TODO: test following options
      // multipleStatements: true,
    };

    const connection = mysql2.createConnection(options);
    connection._database_name = database;
    if (isReadOnly) {
      await this.query(connection, 'SET SESSION TRANSACTION READ ONLY');
    }
    return connection;
  },
  async close(pool) {
    return pool.close();
  },
  query(connection, sql) {
    if (sql == null) {
      return {
        rows: [],
        columns: [],
      };
    }

    return new Promise((resolve, reject) => {
      connection.query(sql, function (error, results, fields) {
        if (error) reject(error);
        const columns = extractColumns(fields);
        resolve({ rows: results && columns && results.map && results.map(row => zipDataRow(row, columns)), columns });
      });
    });
  },
  async stream(connection, sql, options) {
    const query = connection.query(sql);
    let columns = [];

    // const handleInfo = (info) => {
    //   const { message, lineNumber, procName } = info;
    //   options.info({
    //     message,
    //     line: lineNumber,
    //     procedure: procName,
    //     time: new Date(),
    //     severity: 'info',
    //   });
    // };

    const handleEnd = () => {
      options.done();
    };

    const handleRow = row => {
      if (row && row.constructor && (row.constructor.name == 'OkPacket' || row.constructor.name == 'ResultSetHeader')) {
        options.info({
          message: `${row.affectedRows} rows affected`,
          time: new Date(),
          severity: 'info',
        });
      } else {
        if (columns) {
          options.row(zipDataRow(row, columns));
        }
      }
    };

    const handleFields = fields => {
      columns = extractColumns(fields);
      if (columns) options.recordset(columns);
    };

    const handleError = error => {
      console.log('ERROR', error);
      const { message, lineNumber, procName } = error;
      options.info({
        message,
        line: lineNumber,
        procedure: procName,
        time: new Date(),
        severity: 'error',
      });
    };

    query.on('error', handleError).on('fields', handleFields).on('result', handleRow).on('end', handleEnd);
  },
  async readQuery(connection, sql, structure) {
    const query = connection.query(sql);

    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    let columns = [];
    query
      .on('error', err => {
        console.error(err);
        pass.end();
      })
      .on('fields', fields => {
        columns = extractColumns(fields);
        pass.write({
          __isStreamHeader: true,
          ...(structure || { columns }),
        });
      })
      .on('result', row => pass.write(zipDataRow(row, columns)))
      .on('end', () => pass.end());

    return pass;
  },
  async getVersion(connection) {
    const { rows } = await this.query(connection, "show variables like 'version'");
    const version = rows[0].Value;
    if (version) {
      const m = version.match(/(.*)-MariaDB-/);
      if (m) {
        return {
          version,
          versionText: `MariaDB ${m[1]}`,
        };
      }
    }

    return {
      version,
      versionText: `MySQL ${version}`,
    };
  },
  async listDatabases(connection) {
    const { rows } = await this.query(connection, 'show databases');
    return rows.map(x => ({ name: x.Database }));
  },
  async writeTable(pool, name, options) {
    // @ts-ignore
    return createBulkInsertStreamBase(this, stream, pool, name, options);
  },
  async createBackupDumper(pool, options) {
    const { outputFile, databaseName, schemaName } = options;
    const res = new MySqlDumper({
      connection: pool,
      schema: databaseName || schemaName,
      outputFile,
    });
    return res;
  },
  getAuthTypes() {
    return [
      {
        title: 'Host and port',
        name: 'hostPort',
        disabledFields: ['socketPath'],
      },
      {
        title: 'Socket',
        name: 'socket',
        disabledFields: ['server', 'port'],
      },
    ];
  },
}));

module.exports = drivers;
