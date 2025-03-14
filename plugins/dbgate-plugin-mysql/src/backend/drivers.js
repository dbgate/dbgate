const _ = require('lodash');
const stream = require('stream');
const driverBases = require('../frontend/drivers');
const Analyser = require('./Analyser');
const mysql2 = require('mysql2');
const { getLogger, createBulkInsertStreamBase, makeUniqueColumnNames, extractErrorLogData } =
  global.DBGATE_PACKAGES['dbgate-tools'];

const logger = getLogger('mysqlDriver');

let authProxy;

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

  async connect(props) {
    const { server, port, user, password, database, ssl, isReadOnly, forceRowsAsObjects, socketPath, authType } = props;
    let awsIamToken = null;
    if (authType == 'awsIam') {
      awsIamToken = await authProxy.getAwsIamToken(props);
    }

    const options = {
      host: authType == 'socket' ? null : server,
      port: authType == 'socket' ? null : port,
      socketPath: authType == 'socket' ? socketPath || driverBase.defaultSocketPath : null,
      user,
      password: awsIamToken || password,
      database,
      ssl: authType == 'awsIam' ? ssl || { rejectUnauthorized: false } : ssl,
      rowsAsArray: forceRowsAsObjects ? false : true,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
      // TODO: test following options
      // multipleStatements: true,
    };

    const client = mysql2.createConnection(options);
    const dbhan = {
      client,
      database,
    };
    if (isReadOnly) {
      await this.query(dbhan, 'SET SESSION TRANSACTION READ ONLY');
    }
    return dbhan;
  },
  close(dbhan) {
    return new Promise(resolve => {
      dbhan.client.end(resolve);
    });
  },
  query(dbhan, sql, options) {
    if (sql == null) {
      return {
        rows: [],
        columns: [],
      };
    }

    if (
      options?.importSqlDump &&
      (sql.trim().startsWith('/*!') || sql.trim().startsWith('/*M!')) &&
      (sql.includes('character_set_client') || sql.includes('NOTE_VERBOSITY'))
    ) {
      // skip this in SQL dumps
      return {
        rows: [],
        columns: [],
      };
    }

    return new Promise((resolve, reject) => {
      dbhan.client.query(sql, function (error, results, fields) {
        if (error) reject(error);
        const columns = extractColumns(fields);
        resolve({ rows: results && columns && results.map && results.map(row => zipDataRow(row, columns)), columns });
      });
    });
  },
  async stream(dbhan, sql, options) {
    const query = dbhan.client.query(sql);
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
      logger.error(extractErrorLogData(error), 'Stream error');
      const { message } = error;
      options.info({
        message,
        line: 0,
        time: new Date(),
        severity: 'error',
      });
    };

    query.on('error', handleError).on('fields', handleFields).on('result', handleRow).on('end', handleEnd);
  },
  async readQuery(dbhan, sql, structure) {
    const query = dbhan.client.query(sql);

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
  async getVersion(dbhan) {
    const { rows } = await this.query(dbhan, "show variables like 'version'");
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
  async listDatabases(dbhan) {
    const { rows } = await this.query(dbhan, 'show databases');
    return rows.map(x => ({ name: x.Database }));
  },
  async writeTable(dbhan, name, options) {
    // @ts-ignore
    return createBulkInsertStreamBase(this, stream, dbhan, name, options);
  },
  getAuthTypes() {
    const res = [
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
    if (authProxy.supportsAwsIam()) {
      res.push({
        title: 'AWS IAM',
        name: 'awsIam',
      });
    }
    return res;
  },
}));

drivers.initialize = dbgateEnv => {
  authProxy = dbgateEnv.authProxy;
};

module.exports = drivers;
