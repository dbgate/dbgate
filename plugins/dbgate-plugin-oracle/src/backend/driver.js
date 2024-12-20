const _ = require('lodash');
const stream = require('stream');

const driverBase = require('../frontend/driver');
const Analyser = require('./Analyser');
const { makeUniqueColumnNames } = global.DBGATE_PACKAGES['dbgate-tools'];
const createOracleBulkInsertStream = require('./createOracleBulkInsertStream');

let platformInfo;

let oracledbValue;
function getOracledb() {
  if (!oracledbValue) {
    oracledbValue = require('oracledb');
    oracledbValue.fetchAsString = [oracledbValue.CLOB, oracledbValue.NCLOB];
  }
  return oracledbValue;
}

function extractOracleColumns(result) {
  if (!result /*|| !result.fields */) return [];
  const res = result.map(fld => ({
    columnName: fld.name, //columnName: fld.name.toLowerCase(),
  }));
  makeUniqueColumnNames(res);
  return res;
}

function zipDataRow(rowArray, columns) {
  let obj = _.zipObject(
    columns.map(x => x.columnName),
    rowArray
  );
  //console.log('zipDataRow columns', columns);
  //console.log('zipDataRow', obj);
  return obj;
}

let oracleClientInitialized = false;

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBase,
  analyserClass: Analyser,

  async connect({
    engine,
    server,
    port,
    user,
    password,
    database,
    databaseUrl,
    useDatabaseUrl,
    serviceName,
    serviceNameType,
    ssl,
    isReadOnly,
    authType,
    clientLibraryPath,
    socketPath,
  }) {
    const oracledb = getOracledb();
    if (authType == 'thick' && !oracleClientInitialized) {
      oracledb.initOracleClient({ libDir: clientLibraryPath || process.env.ORACLE_INSTANT_CLIENT });
      oracleClientInitialized = true;
    }
    client = await oracledb.getConnection({
      user,
      password,
      connectString: useDatabaseUrl
        ? databaseUrl
        : serviceName
        ? serviceNameType == 'sid'
          ? `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${server})(PORT=${
              port || 1521
            }))(CONNECT_DATA=(SID=${serviceName})))`
          : `${server}:${port || 1521}/${serviceName}`
        : `${server}:${port || 1521}`,
    });
    if (database) {
      await client.execute(`ALTER SESSION SET CURRENT_SCHEMA = ${database}`);
    }
    return {
      client,
      database,
    };
  },
  async close(dbhan) {
    return dbhan.client.close();
  },
  async query(dbhan, sql) {
    if (sql == null || sql.trim() == '') {
      return {
        rows: [],
        columns: [],
      };
    }

    const mtrim = sql.match(/^(.*);\s*$/s);
    if (mtrim) {
      sql = mtrim[1];
    }

    const res = await dbhan.client.execute(sql);
    try {
      const columns = extractOracleColumns(res.metaData);
      return { rows: (res.rows || []).map(row => zipDataRow(row, columns)), columns };
    } catch (err) {
      return {
        rows: [],
        columns: [],
      };
    }
  },
  stream(dbhan, sql, options) {
    /*
    const query = new pg.Query({
      text: sql,
      rowMode: 'array',
    });
*/
    // console.log('queryStream', sql);

    if (sql.trim().toLowerCase().startsWith('select')) {
      const query = dbhan.client.queryStream(sql);
      // const consumeStream = new Promise((resolve, reject) => {
      let rowcount = 0;
      let wasHeader = false;

      query.on('metadata', row => {
        // console.log('metadata', row);
        if (!wasHeader) {
          columns = extractOracleColumns(row);
          if (columns && columns.length > 0) {
            options.recordset(columns);
          }
          wasHeader = true;
        }

        // options.row(zipDataRow(row, columns));
      });

      query.on('data', row => {
        // console.log('stream DATA');
        if (!wasHeader) {
          columns = extractOracleColumns(row);
          if (columns && columns.length > 0) {
            options.recordset(columns);
          }
          wasHeader = true;
        }
        options.row(zipDataRow(row, columns));
      });

      query.on('end', () => {
        const { command, rowCount } = query._result || {};

        if (command != 'SELECT' && _.isNumber(rowCount)) {
          options.info({
            message: `${rowCount} rows affected`,
            time: new Date(),
            severity: 'info',
          });
        }

        if (!wasHeader) {
          columns = extractOracleColumns(query._result);
          if (columns && columns.length > 0) {
            options.recordset(columns);
          }
          wasHeader = true;
        }

        options.done();
      });

      query.on('error', error => {
        const { message, offset, procName } = error;
        // get line number from string s of character at offset
        const lineNumber = (sql.substring(0, offset).match(/\n/g) || []).length;
        options.info({
          message,
          offset,
          line: lineNumber,
          procedure: procName,
          time: new Date(),
          severity: 'error',
        });
        options.done();
      });
      query.on('close', function () {
        //console.log("stream 'close' event");
        // The underlying ResultSet has been closed, so the connection can now
        // be closed, if desired.  Note: do not close connections on 'end'.
        //resolve(rowcount);
      });
      //});
    } else {
      dbhan.client.execute(sql, (err, res) => {
        if (err) {
          console.log('Error query', err, sql);
          const lineNumber = (sql.substring(0, err.offset).match(/\n/g) || []).length;
          options.info({
            message: err.message,
            line: lineNumber,
            offset: err.offset,
            time: new Date(),
            severity: 'error',
          });
        } else {
          const { rowsAffected, metaData, rows } = res || {};

          if (rows && metaData) {
            const columns = extractOracleColumns(metaData);
            options.recordset(columns);
            for (const row of rows) {
              options.row(zipDataRow(row, columns));
            }
          } else if (rowsAffected) {
            options.info({
              message: `${rowsAffected} rows affected`,
              time: new Date(),
              severity: 'info',
            });
          }
        }
        options.done();
      });
    }
    //const numrows = await consumeStream;
    //console.log('Rows selected: ' + numrows);
    //client.query(query);
  },
  async getVersionCore(dbhan) {
    try {
      const { rows } = await this.query(
        dbhan,
        "SELECT product || ' ' || version_full as \"version\" FROM product_component_version WHERE product LIKE 'Oracle%Database%'"
      );
      return rows[0].version.replace('  ', ' ');
    } catch (e) {
      const { rows } = await this.query(dbhan, 'SELECT banner as "version" FROM v$version');
      return rows[0].version;
    }
  },
  async getVersion(dbhan) {
    try {
      //const { rows } = await this.query(client, "SELECT banner as version FROM v$version WHERE banner LIKE 'Oracle%'");
      // const { rows } = await this.query(client, 'SELECT version as "version" FROM v$instance');
      const version = await this.getVersionCore(dbhan);

      const m = version.match(/(\d+[a-z]+)\s+(\w+).*?(\d+)\.(\d+)/);
      //console.log('M', m);
      let versionText = null;
      let versionMajor = null;
      let versionMinor = null;
      if (m) {
        versionText = `Oracle ${m[1]} ${m[2]}`;
        if (m[3]) versionMajor = parseInt(m[3]);
        if (m[4]) versionMinor = parseInt(m[4]);
      }

      return {
        version,
        versionText,
        versionMajor,
        versionMinor,
      };
    } catch (e) {
      return {
        version: '???',
        versionText: 'Oracle ???',
        versionMajor: null,
        versionMinor: null,
      };
    }
  },
  async readQuery(dbhan, sql, structure) {
    /*
    const query = new pg.Query({
      text: sql,
      rowMode: 'array',
    });
*/
    // console.log('readQuery', sql, structure);
    const query = await dbhan.client.queryStream(sql);

    let wasHeader = false;
    let columns = null;

    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    query.on('metadata', row => {
      // console.log('readQuery metadata', row);
      if (!wasHeader) {
        columns = extractOracleColumns(row);
        if (columns && columns.length > 0) {
          pass.write({
            __isStreamHeader: true,
            ...(structure || { columns }),
          });
        }
        wasHeader = true;
      }
    });

    query.on('data', row => {
      pass.write(zipDataRow(row, columns));
    });

    query.on('end', () => {
      pass.end();
    });

    query.on('error', error => {
      console.error(error);
      pass.end();
    });

    //client.query(query);

    return pass;
  },
  async writeTable(dbhan, name, options) {
    return createOracleBulkInsertStream(this, stream, dbhan, name, options);
  },
  async listDatabases(dbhan) {
    const { rows } = await this.query(dbhan, 'SELECT username as "name" from all_users order by username');
    return rows;
  },

  getAuthTypes() {
    if (platformInfo?.isElectron || process.env.ORACLE_INSTANT_CLIENT) {
      return [
        {
          title: 'Thin mode (default) - direct connection to Oracle database',
          name: 'thin',
        },
        {
          title: 'Thick mode - connection via Oracle instant client',
          name: 'thick',
        },
      ];
    }
  },
};

driver.initialize = dbgateEnv => {
  platformInfo = dbgateEnv.platformInfo;
};

module.exports = driver;
