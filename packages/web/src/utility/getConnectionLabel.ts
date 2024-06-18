export function getDatabaseFileLabel(databaseFile) {
  if (!databaseFile) return databaseFile;
  const m = databaseFile.match(/[\/]([^\/]+)$/);
  if (m) return m[1];
  return databaseFile;
}

function getConnectionLabelCore(connection, { allowExplicitDatabase = true } = {}) {
  if (!connection) {
    return null;
  }
  if (connection.displayName) {
    return connection.displayName;
  }
  if (connection.singleDatabase && connection.server && allowExplicitDatabase && connection.defaultDatabase) {
    return `${connection.defaultDatabase} on ${connection.server}`;
  }
  if (connection.databaseFile) {
    return getDatabaseFileLabel(connection.databaseFile);
  }
  if (connection.server) {
    return connection.server;
  }
  if (connection.singleDatabase && connection.defaultDatabase) {
    return `${connection.defaultDatabase}`;
  }
  if (connection.useDatabaseUrl) {
    return `${connection.databaseUrl}`;
  }

  return '';
}

export default function getConnectionLabel(connection, { allowExplicitDatabase = true, showUnsaved = false } = {}) {
  const res = getConnectionLabelCore(connection, { allowExplicitDatabase });

  if (res && showUnsaved && connection?.unsaved) {
    return `${res} - unsaved`;
  }

  return res;
}
