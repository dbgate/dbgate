const _ = require('lodash');
const stream = require('stream');
const makeUniqueColumnNames = require('./makeUniqueColumnNames');
const { extractDbNameFromComposite } = global.DBGATE_PACKAGES['dbgate-tools'];

// async function nativeQueryCore(pool, sql, options) {
//   if (sql == null) {
//     return Promise.resolve({
//       rows: [],
//       columns: [],
//     });
//   }
//   return new Promise((resolve, reject) => {
//     pool.query(sql, (err, rows) => {
//       if (err) reject(err);
//       resolve({
//         rows,
//       });
//     });
//   });
// }

let msnodesqlv8Value;
function getMsnodesqlv8() {
  if (!msnodesqlv8Value) {
    msnodesqlv8Value = require('msnodesqlv8');
  }
  return msnodesqlv8Value;
}

function extractNativeColumns(meta) {
  const res = meta.map(col => {
    const resCol = {
      columnName: col.name,
      dataType: col.sqlType.toLowerCase(),
      notNull: !col.nullable,
    };

    if (resCol.dataType.endsWith(' identity')) {
      resCol.dataType = resCol.dataType.replace(' identity', '');
      resCol.autoIncrement = true;
    }
    if (col.size && resCol.dataType.includes('char')) {
      resCol.dataType += `(${col.size})`;
    }
    return resCol;
  });

  makeUniqueColumnNames(res);

  return res;
}

async function connectWithDriver({ server, port, user, password, database, authType }, driver) {
  let connectionString = `server=${server}`;
  if (port && !server.includes('\\')) connectionString += `,${port}`;
  connectionString += `;Driver={${driver}}`;
  if (authType == 'sspi') connectionString += ';Trusted_Connection=Yes';
  else connectionString += `;UID=${user};PWD=${password}`;
  if (database) connectionString += `;Database=${extractDbNameFromComposite(database)}`;
  return new Promise((resolve, reject) => {
    getMsnodesqlv8().open(connectionString, (err, conn) => {
      if (err) {
        reject(err);
      } else {
        resolve(conn);
      }
    });
  });
}

async function nativeConnect(connection) {
  const drivers = ['ODBC Driver 17 for SQL Server', 'SQL Server Native Client 11.0'];

  for (let i = 0; i < drivers.length; i += 1) {
    try {
      const res = await connectWithDriver(connection, drivers[i]);
      console.error(`Connected SQL Server with ${drivers[i]} driver`);
      return res;
    } catch (err) {
      if (err.message && err.message.includes('[ODBC Driver Manager]') && i < drivers.length - 1) {
        console.error(`Failed connecting with ${drivers[i]} driver, trying next`, err);
        continue;
      }
      throw new Error(`${err}`);
    }
  }
}

async function nativeQueryCore(dbhan, sql, options) {
  if (sql == null) {
    return Promise.resolve({
      rows: [],
      columns: [],
    });
  }
  return new Promise((resolve, reject) => {
    let columns = null;
    let currentRow = null;
    const q = dbhan.client.query(sql);
    const rows = [];

    q.on('meta', meta => {
      columns = extractNativeColumns(meta);
    });

    q.on('column', (index, data) => {
      currentRow[columns[index].columnName] = data;
    });

    q.on('row', index => {
      if (currentRow) rows.push(currentRow);
      currentRow = {};
    });

    q.on('error', err => {
      reject(err);
    });

    q.on('done', () => {
      if (currentRow) rows.push(currentRow);
      resolve({
        columns,
        rows,
      });
    });
  });
}

async function nativeReadQuery(dbhan, sql, structure) {
  const pass = new stream.PassThrough({
    objectMode: true,
    highWaterMark: 100,
  });

  let columns = null;
  let currentRow = null;
  const q = dbhan.client.query(sql);

  q.on('meta', meta => {
    columns = extractNativeColumns(meta);
    pass.write({
      __isStreamHeader: true,
      ...(structure || { columns }),
    });
  });

  q.on('column', (index, data) => {
    currentRow[columns[index].columnName] = data;
  });

  q.on('row', index => {
    if (currentRow) pass.write(currentRow);
    currentRow = {};
  });

  q.on('error', err => {
    console.error(err);
    pass.end();
  });

  q.on('done', () => {
    if (currentRow) pass.write(currentRow);
    pass.end();
  });

  return pass;
}

async function nativeStream(dbhan, sql, options) {
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

  let columns = null;
  let currentRow = null;
  const q = dbhan.client.query(sql);

  q.on('meta', meta => {
    if (currentRow) options.row(currentRow);
    currentRow = null;
    columns = extractNativeColumns(meta);
    options.recordset(columns);
  });

  q.on('column', (index, data) => {
    currentRow[columns[index].columnName] = data;
  });

  q.on('row', index => {
    if (currentRow) options.row(currentRow);
    currentRow = {};
  });

  q.on('error', err => {
    handleError(err);
    options.done();
  });

  q.on('info', info => {
    handleInfo(info);
  });

  q.on('done', () => {
    if (currentRow) options.row(currentRow);
    options.done();
  });
}

module.exports = {
  nativeConnect,
  nativeQueryCore,
  nativeReadQuery,
  nativeStream,
};
