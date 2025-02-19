const _ = require('lodash');
const stream = require('stream');

const driverBases = require('../frontend/drivers');
const Analyser = require('./Analyser');
const { splitQuery, postgreSplitterOptions } = require('dbgate-query-splitter');
const wkx = require('wkx');
const duckdb = require('duckdb-async');
const pgCopyStreams = require('pg-copy-streams');
const {
  getLogger,
  createBulkInsertStreamBase,
  makeUniqueColumnNames,
  extractDbNameFromComposite,
  extractErrorLogData,
} =require('dbgate-tools');


const logger = getLogger('duckdbDriver');

global.duckdbConnections = {};
let connections = global.duckdbConnections;

/** @type {import('dbgate-types').EngineDriver} */
const drivers = driverBases.map(driverBase => ({
  ...driverBase,
  analyserClass: Analyser,

  async connect(props) {
    const {
      databaseUrl,
      password,
      isReadOnly,
    } = props;

    // TODO: only support readonly mode now for duckdb
    let client = null;
    if(!connections[databaseUrl]) {
        logger.debug(`Connecting to ${databaseUrl}`);
        let accessMode = isReadOnly ? duckdb.OPEN_READONLY : duckdb.OPEN_READWRITE;
        client = await duckdb.Database.create(databaseUrl, accessMode);
    } else {
        logger.debug(`Using existing connection to ${databaseUrl}`);
        client = connections[databaseUrl];
    }
    await client.connect();

    const dbhan = {
      client,
      databaseUrl
    };

    // await this.query(dbhan, `SET s3_endpoint='s3.cn-northwest-1.amazonaws.com.cn';`);

    const datatypes = await this.query(dbhan, `SELECT oid::text as oid, typname FROM pg_type WHERE typname in ('geography')`);
    const typeIdToName = _.fromPairs(datatypes.rows.map(cur => [cur.oid, cur.typname]));
    dbhan.typeIdToName = typeIdToName;

    return dbhan;
  },
  async close(dbhan) {
    connections[dbhan.databaseUrl] = null;
    // dbhan.client.closeSync();
    delete connections[dbhan.databaseUrl];
    return await dbhan.client.close();
  },
  async query(dbhan, sql) {
    const stmt = await dbhan.client.prepare(sql);
    // logger.debug(`prepare sql:\n${sql}`);
    // stmt.raw();
    try {
      const columns = stmt.columns();
      const rows = await stmt.all();
      // bigint to Number
      rows.forEach(row => {
        columns.forEach(col => {
          if (col.type == 'bigint') {
            row[col.name] = Number(row[col.name]);
          }
        });
      })
      return {
        rows,
        columns: columns.map((col) => ({
          columnName: col.name,
          dataType: col.type,
        })),
      };
    } catch (error) {
      logger.error(extractErrorLogData(error), 'Query error');
      throw error;
    } finally {
      await stmt.finalize();
    }
  },
  async stream(dbhan, sql, options) {
    const query = await dbhan.client.prepare(sql);
    const columns = query.columns().map(it=>({
        columnName: it.name,
        dataTypeId: it.type.id,
        dataTypeName: it.type.sql_type
    }));
    makeUniqueColumnNames(columns);
    options.recordset(columns);
    const rows = await query.all();
    for (const row of rows) {
      options.row(row);
    }
    options.done();
  },
  async getVersion(dbhan) {
    const { rows } = await this.query(dbhan, 'select version() as version');
    const { version } = rows[0];

    return {
      version,
      versionText: `duckdb ${version}`,
    };
  },
  async readQueryTask(stmt, pass) {
    // stmt.each(async (err, row) => {
    //     if (err) {
    //         console.error('Error:', err);
    //     } else {
    //         if (!pass.write(row)) {
    //             console.log('WAIT DRAIN');
    //             await waitForDrain(pass);
    //           }
    //     }
    // }, () => {
    //     console.log('Query complete sql:', stmt.stmt.sql);
    //     pass.end();
    // });
    let sent = 0;
    for (const row of await stmt.all()) {
      sent++;
      if (!pass.write(row)) {
        console.log('WAIT DRAIN', sent);
        await waitForDrain(pass);
      }
    }
    pass.end();
  },
  async readQuery(dbhan, sql, structure) {
    logger.debug('readQuery', sql);
    const pass = new stream.PassThrough({
      objectMode: true,
      highWaterMark: 100,
    });

    const stmt = await dbhan.client.prepare(sql);
    const columns = stmt.columns();

    pass.write({
      __isStreamHeader: true,
      ...(structure || {
        columns: columns.map((col) => ({
          columnName: col.name,
          dataType: col.type,
        })),
      }),
    });
    this.readQueryTask(stmt, pass);

    return pass;
  },
  async writeTable(dbhan, name, options) {
    // @ts-ignore
    return createBulkInsertStreamBase(this, stream, dbhan, name, options);
  },
//   async listDatabases(dbhan) {
//     const { rows } = await this.query(dbhan, "SELECT datname AS name FROM pg_database WHERE datname != 'temp'");
//     return rows;
//   },
  async listDatabases(dbhan) {
    const { rows } = await this.query(dbhan, 'show databases;');
    return rows.map(db => ({name: db.database_name}))
  },
  async listSchemas(dbhan) {
    const schemaRows = await this.query(
      dbhan,
      'select oid::int as "object_id", nspname as "schema_name" from pg_catalog.pg_namespace'
    );
    const defaultSchemaRows = await this.query(dbhan, 'SELECT current_schema');
    const defaultSchema = defaultSchemaRows.rows[0]?.current_schema?.trim();

    logger.debug(`Loaded ${schemaRows.rows.length} duckdb schemas`);

    const schemas = schemaRows.rows.map(x => ({
      schemaName: x.schema_name,
      objectId: x.object_id,
      isDefault: x.schema_name == defaultSchema,
    }));

    return schemas;
  },

  async writeQueryFromStream(dbhan, sql) {
    const stream = await dbhan.client.query(pgCopyStreams.from(sql));
    return stream;
  },
}));

drivers.initialize = dbgateEnv => {
  authProxy = dbgateEnv.authProxy;
};

module.exports = drivers;
