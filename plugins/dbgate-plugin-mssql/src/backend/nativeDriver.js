const _ = require('lodash');
const stream = require('stream');
const makeUniqueColumnNames = require('./makeUniqueColumnNames');
let msnodesqlv8;

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

async function nativeConnect({ server, port, user, password, database, authType }) {
  let connectionString = `server=${server}`;
  if (port && !server.includes('\\')) connectionString += `,${port}`;
  connectionString += ';Driver={SQL Server Native Client 11.0}';
  if (authType == 'sspi') connectionString += ';Trusted_Connection=Yes';
  else connectionString += `;UID=${user};PWD=${password}`;
  if (database) connectionString += `;Database=${database}`;
  return new Promise((resolve, reject) => {
    msnodesqlv8.open(connectionString, (err, conn) => {
      if (err) reject(err);
      conn._connectionType = 'msnodesqlv8';
      resolve(conn);
    });
  });
}

async function nativeQueryCore(pool, sql, options) {
  if (sql == null) {
    return Promise.resolve({
      rows: [],
      columns: [],
    });
  }
  return new Promise((resolve, reject) => {
    let columns = null;
    let currentRow = null;
    const q = pool.query(sql);
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

async function nativeReadQuery(pool, sql, structure) {
  const pass = new stream.PassThrough({
    objectMode: true,
    highWaterMark: 100,
  });

  let columns = null;
  let currentRow = null;
  const q = pool.query(sql);

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

async function nativeStream(pool, sql, options) {
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
  const q = pool.query(sql);

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

const initialize = dbgateEnv => {
  if (dbgateEnv.nativeModules && dbgateEnv.nativeModules.msnodesqlv8) {
    msnodesqlv8 = dbgateEnv.nativeModules.msnodesqlv8();
  }
};

module.exports = {
  nativeConnect,
  nativeQueryCore,
  nativeReadQuery,
  nativeStream,
  initialize,
};
