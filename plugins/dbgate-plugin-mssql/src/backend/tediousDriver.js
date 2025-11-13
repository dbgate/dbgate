const _ = require('lodash');
const stream = require('stream');
const tedious = require('tedious');
const { ManagedIdentityCredential } = require('@azure/identity');
const makeUniqueColumnNames = require('./makeUniqueColumnNames');
const { extractDbNameFromComposite } = global.DBGATE_PACKAGES['dbgate-tools'];

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

function modifyRow(row, columns) {
  columns.forEach((col) => {
    if (Buffer.isBuffer(row[col.columnName])) {
      row[col.columnName] = { $binary: { base64: Buffer.from(row[col.columnName]).toString('base64') } };
    }
  });
  return row;
}

async function getDefaultAzureSqlToken() {
  const credential = new ManagedIdentityCredential();
  const tokenResponse = await credential.getToken('https://database.windows.net/.default');
  return tokenResponse.token;
}

async function getAuthentication({ authType, accessToken, user, password, windowsDomain }) {
  switch (authType) {
    case 'azureManagedIdentity':
      const token = await getDefaultAzureSqlToken();
      return {
        type: 'azure-active-directory-access-token',
        options: {
          token,
        },
      };

    case 'msentra':
      return {
        type: 'azure-active-directory-access-token',
        options: {
          token: accessToken,
        },
      };
    default:
      return {
        type: windowsDomain ? 'ntlm' : 'default',
        options: {
          userName: user,
          password: password,
          ...(windowsDomain ? { domain: windowsDomain } : {}),
        },
      };
  }
}

async function tediousConnect(storedConnection) {
  const { server, port, database, ssl, trustServerCertificate, authType } = storedConnection;

  const authentication = await getAuthentication(storedConnection);

  return new Promise((resolve, reject) => {
    const [host, instance] = (server || '').split('\\');
    const connectionOptions = {
      instanceName: instance,
      encrypt:
        !!ssl ||
        authType == 'msentra' ||
        authType == 'azureManagedIdentity' ||
        server?.endsWith('.database.windows.net'),
      cryptoCredentialsDetails: ssl ? _.pick(ssl, ['ca', 'cert', 'key']) : undefined,
      trustServerCertificate: ssl ? (!ssl.ca && !ssl.cert && !ssl.key ? true : ssl.rejectUnauthorized) : undefined,
      enableArithAbort: true,
      validateBulkLoadParameters: false,
      requestTimeout: 1000 * 3600,
      port: port && !instance ? parseInt(port) : undefined,
      trustServerCertificate: !!trustServerCertificate,
      appName: 'DbGate',
    };

    if (database) {
      connectionOptions.database = extractDbNameFromComposite(database);
    }

    const connection = new tedious.Connection({
      server: host,
      authentication,
      options: connectionOptions,
    });
    connection.on('connect', function (err) {
      if (err) {
        reject(err);
      }
      resolve(connection);
    });
    connection.connect();
  });
}

async function tediousQueryCore(dbhan, sql, options) {
  if (sql == null) {
    return Promise.resolve({
      rows: [],
      columns: [],
    });
  }
  const { addDriverNativeColumn, discardResult } = options || {};
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
        modifyRow(
          _.zipObject(
            result.columns.map(x => x.columnName),
            columns.map(x => x.value)
          ),
          result.columns
        )
      );
    });
    dbhan.client.execSqlBatch(request);
    // if (discardResult) dbhan.client.execSqlBatch(request);
    // else dbhan.client.execSql(request);
  });
}

async function tediousReadQuery(dbhan, sql, structure) {
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
      engine: 'mssql@dbgate-plugin-mssql',
      ...(structure || { columns: currentColumns }),
    });
  });
  request.on('row', function (columns) {
    const row = modifyRow(
      _.zipObject(
        currentColumns.map(x => x.columnName),
        columns.map(x => x.value)
      ),
      currentColumns
    );
    pass.write(row);
  });
  dbhan.client.execSql(request);

  return pass;
}

async function tediousStream(dbhan, sql, options) {
  let currentColumns = [];
  let skipAffectedMessage = false;

  const handleInfo = info => {
    const { message, lineNumber, procName } = info;
    options.info({
      message,
      line: lineNumber != null && lineNumber > 0 ? lineNumber - 1 : lineNumber,
      procedure: procName,
      time: new Date(),
      severity: 'info',
    });
  };
  const handleError = error => {
    const { message, lineNumber, procName } = error;
    options.info({
      message,
      line: lineNumber != null && lineNumber > 0 ? lineNumber - 1 : lineNumber,
      procedure: procName,
      time: new Date(),
      severity: 'error',
    });
  };
  const handleDatabaseChange = database => {
    options.changedCurrentDatabase(database);
  };

  dbhan.client.on('databaseChange', handleDatabaseChange);
  dbhan.client.on('infoMessage', handleInfo);
  dbhan.client.on('errorMessage', handleError);
  const request = new tedious.Request(sql, (err, rowCount) => {
    // if (err) reject(err);
    // else resolve(result);
    options.done();
    dbhan.client.off('infoMessage', handleInfo);
    dbhan.client.off('errorMessage', handleError);

    if (!skipAffectedMessage) {
      options.info({
        message: `${rowCount} rows affected`,
        time: new Date(),
        severity: 'info',
        rowsAffected: rowCount,
      });
    }
  });
  request.on('columnMetadata', function (columns) {
    currentColumns = extractTediousColumns(columns);
    options.recordset(currentColumns, { engine: 'mssql@dbgate-plugin-mssql' });
  });
  request.on('row', function (columns) {
    const row = modifyRow(
      _.zipObject(
        currentColumns.map(x => x.columnName),
        columns.map(x => x.value)
      ),
      currentColumns
    );
    options.row(row);
    skipAffectedMessage = true;
  });
  dbhan.client.execSqlBatch(request);
}

module.exports = {
  tediousConnect,
  tediousQueryCore,
  tediousReadQuery,
  tediousStream,
};
