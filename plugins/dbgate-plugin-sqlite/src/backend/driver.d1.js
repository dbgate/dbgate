// @ts-check
const stream = require('stream');
const D1Analyser = require('./D1Analyser');
const driverBases = require('../frontend/drivers');
const { splitQuery, sqliteSplitterOptions } = require('dbgate-query-splitter');
const { createBulkInsertStreamBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const CloudflareD1Client = require('./clients/CloudflareD1Client');
const { CloudflareD1Error, D1_ERROR_KIND } = require('./cloudflare/CloudflareD1Error');
const sqliteSql = require('./sql');
const { filterD1InternalRows, loadD1IndexColumns } = require('./cloudflare/d1SchemaLoader');
const createD1DumperConnection = require('./d1DumperConnection');
const { backupWithSqliteDumper } = require('./sqliteDumperOperations');

const engine = driverBases[2].engine;

/** @param {any[]} databases @param {string} requestedDatabase */
function resolveD1Database(databases, requestedDatabase) {
  const requested = String(requestedDatabase ?? '').trim();
  if (!requested) return null;
  return (
    databases.find((database) => database.name == requested) ??
    databases.find((database) => database.uuid == requested) ??
    null
  );
}

/**
 * D1 exposes reserved `_cf_*` objects through sqlite_master, but rejects any attempt to inspect
 * them. Keep these implementation details out of schema results returned to the SQLite analyser.
 */
function filterD1InternalObjects(query, result) {
  if (!/\bsqlite_(master|schema)\b/i.test(query)) return result;
  return {
    ...result,
    rows: filterD1InternalRows(result.rows),
  };
}

/** @type {import('dbgate-types').EngineDriver} */
const driver = {
  ...driverBases[2],
  analyserClass: D1Analyser,

  async connect(connection) {
    let client = new CloudflareD1Client({ ...connection, cloudflareDatabaseId: undefined });
    try {
      const databases = await client.listDatabases();
      const requestedDatabase = connection.database || (connection.singleDatabase && connection.cloudflareDatabaseId);
      if (!requestedDatabase) {
        return { client, initialDatabases: databases };
      }

      const database = resolveD1Database(databases, requestedDatabase);
      if (!database) {
        throw new CloudflareD1Error(`Cloudflare D1 database "${requestedDatabase}" was not found in this account`, {
          kind: D1_ERROR_KIND.databaseNotFound,
        });
      }

      await client.close();
      client = new CloudflareD1Client({ ...connection, cloudflareDatabaseId: database.uuid });
      await client.testConnection();
      return { client, databaseName: database.name };
    } catch (err) {
      await client.close();
      throw err;
    }
  },

  async close(dbhan) {
    await dbhan.client.close();
  },

  async backupDatabase(connection, settings, runner) {
    if (!settings.database) {
      throw new Error('DBGM-00000 Select the Cloudflare D1 database to back up');
    }
    // The backup reads the selected database; there is no D1 restore, see frontend/drivers.js.
    return backupWithSqliteDumper(this, { ...connection, database: settings.database }, settings, runner, {
      product: 'Cloudflare D1',
      createDumperConnection: (client) => createD1DumperConnection(client.api),
      reportVersion: false,
      snapshot: false,
    });
  },

  async listDatabases(dbhan) {
    const databases = dbhan.initialDatabases ?? (await dbhan.client.listDatabases());
    dbhan.initialDatabases = null;
    return databases.map((database) => ({ name: database.name }));
  },

  // @ts-ignore
  async query(dbhan, sql) {
    if (sql.trim() == sqliteSql.indexcols.trim()) {
      return loadD1IndexColumns(dbhan.client);
    }
    return filterD1InternalObjects(sql, await dbhan.client.query(sql));
  },

  async stream(dbhan, sql, options) {
    await dbhan.client.stream(splitQuery(sql, sqliteSplitterOptions), options, engine);
  },

  async script(dbhan, sql, options) {
    await dbhan.client.script(splitQuery(sql, this.getQuerySplitterOptions('script')), options);
  },

  async readQuery(dbhan, sql, structure) {
    return dbhan.client.readQuery(sql, structure, engine);
  },

  async writeTable(dbhan, name, options) {
    return createBulkInsertStreamBase(this, stream, dbhan, name, options);
  },

  async getVersion(dbhan) {
    return dbhan.client.getVersion();
  },
};

module.exports = driver;
