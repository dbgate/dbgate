const _ = require('lodash');
const stream = require('stream');

const driverBases = require('../frontend/drivers');
const Analyser = require('./Analyser');
//--const pg = require('pg');
const oracledb = require('oracledb');
const { createBulkInsertStreamBase, makeUniqueColumnNames } = require('dbgate-tools');
const createOracleBulkInsertStream = require('./createOracleBulkInsertStream');

/*
pg.types.setTypeParser(1082, 'text', val => val); // date
pg.types.setTypeParser(1114, 'text', val => val); // timestamp without timezone
pg.types.setTypeParser(1184, 'text', val => val); // timestamp
*/

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

/** @type {import('dbgate-types').EngineDriver} */
const drivers = driverBases.map(driverBase => ({
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
    ssl,
    isReadOnly,
    authType,
    socketPath,
  }) {
    client = await oracledb.getConnection({
      user,
      password,
      connectString: useDatabaseUrl ? databaseUrl : port ? `${server}:${port}/${serviceName}` : server,
    });
    if (database) {
      await client.execute(`ALTER SESSION SET CURRENT_SCHEMA = ${database}`);
    }
    client._schema_name = database;
    return client;
  },
  async close(pool) {
    return pool.end();
  },
  async query(client, sql) {
    if (sql.trim() == 'COMMIT;') {
      sql = 'COMMIT';
    }

    if (sql == null) {
      return {
        rows: [],
        columns: [],
      };
    }
    try {
      //console.log('sql3', sql);
      const res = await client.execute(sql);
      //console.log('res', res);
      const columns = extractOracleColumns(res.metaData);
      //console.log('columns', columns);
      return { rows: (res.rows || []).map(row => zipDataRow(row, columns)), columns };
    } catch (err) {
      console.log('Error query', err, sql);
    } finally {
      //console.log('finally', sql);
    }
  },
  stream(client, sql, options) {
    /*
    const query = new pg.Query({
      text: sql,
      rowMode: 'array',
    });
*/
    // console.log('queryStream', sql);

    if (sql.trim().toLowerCase().startsWith('select')) {
      const query = client.queryStream(sql);
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
        console.log('ERROR', error);
        const { message, lineNumber, procName } = error;
        options.info({
          message,
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
      client.execute(sql, (err, res) => {
        if (err) {
          console.log('Error query', err, sql);
          options.info({
            message: err.message,
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
  async getVersionCore(client) {
    try {
      const { rows } = await this.query(
        client,
        "SELECT product || ' ' || version_full as \"version\" FROM product_component_version WHERE product LIKE 'Oracle%Database%'"
      );
      return rows[0].version.replace('  ', ' ');
    } catch (e) {
      const { rows } = await this.query(client, 'SELECT banner as "version" FROM v$version');
      return rows[0].version;
    }
  },
  async getVersion(client) {
    try {
      //const { rows } = await this.query(client, "SELECT banner as version FROM v$version WHERE banner LIKE 'Oracle%'");
      // const { rows } = await this.query(client, 'SELECT version as "version" FROM v$instance');
      const version = await this.getVersionCore(client);

      const m = version.match(/(\d+[a-z])\s+(\w+).*(\d+)\.(\d+)/);
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
  async readQuery(client, sql, structure) {
    /*
    const query = new pg.Query({
      text: sql,
      rowMode: 'array',
    });
*/
    // console.log('readQuery', sql, structure);
    const query = await client.queryStream(sql);

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

      pass.write(zipDataRow(row, columns));
    });

    query.on('data', row => {
      // console.log('readQuery data', row);
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
  async writeTable(pool, name, options) {
    return createOracleBulkInsertStream(this, stream, pool, name, options);
  },
  async listDatabases(client) {
    const { rows } = await this.query(client, 'SELECT username as "name" from all_users order by username');
    return rows;
  },

  getAuthTypes() {
    return [
      {
        title: 'Host and port',
        name: 'hostPort',
      },
      {
        title: 'Socket',
        name: 'socket',
      },
    ];
  },
}));

module.exports = drivers;
