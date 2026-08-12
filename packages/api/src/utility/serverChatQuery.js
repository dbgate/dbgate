const SERVER_CHAT_ROW_LIMIT = 100;

function ensureServerChatQueryAllowed(connection, driver) {
  if (driver?.readOnlySessions) return;
  if (connection?.isReadOnly) {
    throw new Error('DBGM-00000 Connection is read only');
  }
}

function resolveServerChatDatabaseName(databaseNames, requestedDatabase) {
  const exactMatch = databaseNames.find(name => name === requestedDatabase);
  if (exactMatch) return exactMatch;

  const normalizedRequestedDatabase = requestedDatabase.toLowerCase();
  const caseInsensitiveMatches = databaseNames.filter(
    name => typeof name == 'string' && name.toLowerCase() === normalizedRequestedDatabase
  );

  if (caseInsensitiveMatches.length > 1) {
    throw new Error(
      `DBGM-00000 Database name "${requestedDatabase}" is ambiguous; use exact casing from get_databases`
    );
  }

  return caseInsensitiveMatches[0] ?? null;
}

function limitServerChatQueryResult(response) {
  const sourceRows = Array.isArray(response?.rows) ? response.rows : [];
  const rows = sourceRows.slice(0, SERVER_CHAT_ROW_LIMIT);

  return {
    ...response,
    ...(Array.isArray(response?.rows) ? { rows } : {}),
    returnedRowCount: rows.length,
    truncated: response?.truncated === true || sourceRows.length > rows.length,
  };
}

module.exports = {
  SERVER_CHAT_ROW_LIMIT,
  ensureServerChatQueryAllowed,
  limitServerChatQueryResult,
  resolveServerChatDatabaseName,
};
