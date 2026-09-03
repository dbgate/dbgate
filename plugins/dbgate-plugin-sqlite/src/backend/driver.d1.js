// @ts-check
const stream = require('stream');
const D1Analyser = require('./D1Analyser');
const driverBases = require('../frontend/drivers');
const { splitQuery, sqliteSplitterOptions } = require('dbgate-query-splitter');
const { createBulkInsertStreamBase } = global.DBGATE_PACKAGES['dbgate-tools'];
const CloudflareD1Client = require('./clients/CloudflareD1Client');
const { CloudflareD1Error, D1_ERROR_KIND } = require('./cloudflare/CloudflareD1Error');
const sqliteSql = require('./sql');

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

/** @param {unknown} value */
function isD1InternalName(value) {
  return typeof value == 'string' && value.startsWith('_cf_');
}

/** @param {string} value */
function quotePragmaArgument(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * D1 exposes reserved `_cf_*` objects through sqlite_master, but rejects any attempt to inspect
 * them. Keep these implementation details out of schema results returned to the SQLite analyser.
 */
function filterD1InternalObjects(query, result) {
  if (!/\bsqlite_(master|schema)\b/i.test(query)) return result;
  return {
    ...result,
    rows: result.rows.filter(
      (row) =>
        !isD1InternalName(row.name) &&
        !isD1InternalName(row.pureName) &&
        !isD1InternalName(row.tableName) &&
        !isD1InternalName(row.tbl_name)
    ),
  };
}

/**
 * D1 does not allow SQLite's table-valued pragma_index_* functions used by the standard analyser.
 * Build the same result with the supported statement form, one accessible table at a time.
 */
async function loadD1IndexColumns(client) {
  const objects = await client.query(sqliteSql.objects);
  const tableNames = objects.rows
    .filter((row) => row.type == 'table' && !isD1InternalName(row.name))
    .map((row) => row.name);
  const rows = [];

  for (const tableName of tableNames) {
    const indexList = await client.query(`pragma index_list(${quotePragmaArgument(tableName)})`);
    for (const index of indexList.rows) {
      if (index.origin == 'pk') continue;
      const indexInfo = await client.query(`pragma index_info(${quotePragmaArgument(index.name)})`);
      for (const indexColumn of [...indexInfo.rows].sort((a, b) => a.seqno - b.seqno)) {
        rows.push({
          tableName,
          constraintName: index.name,
          isUnique: index.unique,
          columnName: indexColumn.name,
          origin: index.origin,
        });
      }
    }
  }

  return { rows, columns: [] };
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
