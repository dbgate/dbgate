const D1_SCHEMA_SNAPSHOT_SQL = `
SELECT rowid AS objectId, type, name, tbl_name AS tableName, sql
FROM sqlite_master
WHERE type IN ('table', 'view', 'index', 'trigger')
ORDER BY type, tbl_name, name
`;

/** @param {unknown} value */
function isD1InternalName(value) {
  return typeof value == 'string' && value.startsWith('_cf_');
}

/**
 * Creates the lightweight structure used by DatabaseAnalyser.getModifications(). Index SQL is
 * included in its owning table's hash, so CREATE/DROP INDEX is detected without issuing PRAGMA
 * requests for every table.
 *
 * @param {any[]} rows
 */
function buildD1SchemaSnapshot(rows) {
  const visibleRows = rows.filter(
    (row) => !isD1InternalName(row.name) && !isD1InternalName(row.tableName) && !isD1InternalName(row.tbl_name)
  );
  const indexesByTable = new Map();

  for (const row of visibleRows) {
    if (row.type != 'index') continue;
    const tableName = row.tableName ?? row.tbl_name;
    const indexes = indexesByTable.get(tableName) ?? [];
    indexes.push({ name: row.name, sql: row.sql ?? null });
    indexesByTable.set(tableName, indexes);
  }

  return {
    tables: visibleRows
      .filter((row) => row.type == 'table')
      .map((row) => ({
        pureName: row.name,
        objectId: row.name,
        contentHash: JSON.stringify({
          sql: row.sql ?? null,
          indexes: (indexesByTable.get(row.name) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
        }),
      })),
    views: visibleRows
      .filter((row) => row.type == 'view')
      .map((row) => ({
        pureName: row.name,
        objectId: row.name,
        contentHash: row.sql,
      })),
    triggers: visibleRows
      .filter((row) => row.type == 'trigger')
      .map((row) => ({
        pureName: row.name,
        objectId: row.objectId,
        contentHash: row.sql,
      })),
  };
}

/**
 * Persists exactly the hashes produced by the fast snapshot into a full or partial analysis.
 * Without this step, every later comparison would report unchanged objects as modified.
 *
 * @param {any} structure
 * @param {any} snapshot
 */
function applyD1SnapshotContentHashes(structure, snapshot) {
  const result = { ...structure };
  for (const field of ['tables', 'views', 'triggers']) {
    if (!structure[field]) continue;
    const hashByObjectId = new Map((snapshot[field] ?? []).map((item) => [item.objectId, item.contentHash]));
    result[field] = structure[field].map((item) =>
      hashByObjectId.has(item.objectId) ? { ...item, contentHash: hashByObjectId.get(item.objectId) } : item
    );
  }
  return result;
}

module.exports = {
  D1_SCHEMA_SNAPSHOT_SQL,
  applyD1SnapshotContentHashes,
  buildD1SchemaSnapshot,
};
