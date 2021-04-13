const _ = require('lodash');
const stream = require('stream');
const tedious = require('tedious');
const makeUniqueColumnNames = require('./makeUniqueColumnNames');

function extractTediousColumns(columns, addDriverNativeColumn = false) {
  const res = columns.map(col => {
    const resCol = {
      columnName: col.colName,
      dataType: col.type.name.toLowerCase(),
      driverNativeColumn: addDriverNativeColumn ? col : undefined,

      notNull: !(col.flags & 0x01),
      autoIncrement: !!(col.flags & 0x10),
    };
    if (col.dataLength) resCol.dataType += `(${col.dataLength})`;
    return resCol;
  });

  makeUniqueColumnNames(res);

  return res;
}

async function tediousConnect({ server, port, user, password, database, ssl }) {
  return new Promise((resolve, reject) => {
    const connection = new tedious.Connection({
      server,

      authentication: {
        type: 'default',
        options: {
          userName: user,
          password: password,
        },
      },

      options: {
        encrypt: !!ssl,
        cryptoCredentialsDetails: ssl ? _.pick(ssl, ['ca', 'cert', 'key']) : undefined,
        trustServerCertificate: ssl ? (!ssl.ca && !ssl.cert && !ssl.key ? true : ssl.rejectUnauthorized) : undefined,
        enableArithAbort: true,
        validateBulkLoadParameters: false,
        requestTimeout: 1000 * 3600,
        database,
        port: port ? parseInt(port) : undefined,
      },
    });
    connection.on('connect', function (err) {
      if (err) {
        reject(err);
      }
      connection._connectionType = 'tedious';
      resolve(connection);
    });
    connection.connect();
  });
}

async function tediousQueryCore(pool, sql, options) {
  if (sql == null) {
    return Promise.resolve({
      rows: [],
      columns: [],
    });
  }
  const { addDriverNativeColumn } = options || {};
  return new Promise((resolve, reject) => {
    const result = {
      rows: [],
      columns: [],
    };
    const request = new tedious.Request(sql, (err, rowCount) => {
      if (err) reject(err);
      else resolve(result);
    });
    request.on('columnMetadata', function (columns) {
      result.columns = extractTediousColumns(columns, addDriverNativeColumn);
    });
    request.on('row', function (columns) {
      result.rows.push(
        _.zipObject(
          result.columns.map(x => x.columnName),
          columns.map(x => x.value)
        )
      );
    });
    pool.execSql(request);
  });
}

async function tediousReadQuery(pool, sql, structure) {
  const pass = new stream.PassThrough({
    objectMode: true,
    highWaterMark: 100,
  });
  let currentColumns = [];

  const request = new tedious.Request(sql, (err, rowCount) => {
    if (err) console.error(err);
    pass.end();
  });
  request.on('columnMetadata', function (columns) {
    currentColumns = extractTediousColumns(columns);
    pass.write({
      __isStreamHeader: true,
      ...(structure || { columns: currentColumns }),
    });
  });
  request.on('row', function (columns) {
    const row = _.zipObject(
      currentColumns.map(x => x.columnName),
      columns.map(x => x.value)
    );
    pass.write(row);
  });
  pool.execSql(request);

  return pass;
}

async function tediousStream(pool, sql, options) {
  let currentColumns = [];

  const handleInfo = info => {
    const { message, lineNumber, procName } = info;
    options.info({
      message,
      line: lineNumber,
      procedure: procName,
      time: new Date(),
      severity: 'info',
    });
  };
  const handleError = error => {
    const { message, lineNumber, procName } = error;
    options.info({
      message,
      line: lineNumber,
      procedure: procName,
      time: new Date(),
      severity: 'error',
    });
  };

  pool.on('infoMessage', handleInfo);
  pool.on('errorMessage', handleError);
  const request = new tedious.Request(sql, (err, rowCount) => {
    // if (err) reject(err);
    // else resolve(result);
    options.done();
    pool.off('infoMessage', handleInfo);
    pool.off('errorMessage', handleError);

    options.info({
      message: `${rowCount} rows affected`,
      time: new Date(),
      severity: 'info',
    });
  });
  request.on('columnMetadata', function (columns) {
    currentColumns = extractTediousColumns(columns);
    options.recordset(currentColumns);
  });
  request.on('row', function (columns) {
    const row = _.zipObject(
      currentColumns.map(x => x.columnName),
      columns.map(x => x.value)
    );
    options.row(row);
  });
  pool.execSqlBatch(request);
}

module.exports = {
  tediousConnect,
  tediousQueryCore,
  tediousReadQuery,
  tediousStream,
};
