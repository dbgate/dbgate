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
  if (connection.useDatabaseUrl) {
    return `${connection.databaseUrl}`;
  }
  if (connection.singleDatabase && connection.server && allowExplicitDatabase && connection.defaultDatabase) {
    return `${connection.defaultDatabase} on ${connection.server}`;
  }
  if (connection.databaseFile) {
    return getDatabaseFileLabel(connection.databaseFile);
  }
  if (connection.useSshTunnel && connection.server == 'localhost') {
    return `${connection.sshHost} - SSH`;
  }
  if (connection.server) {
    return connection.server;
  }
  if (connection.singleDatabase && connection.defaultDatabase) {
    return `${connection.defaultDatabase}`;
  }

  return '';
}

export function getConnectionLabel(connection, { allowExplicitDatabase = true, showUnsaved = false } = {}) {
  const res = getConnectionLabelCore(connection, { allowExplicitDatabase });

  if (res && showUnsaved && connection?.unsaved) {
    return `${res} - unsaved`;
  }

  return res;
}

export function getEngineLabel(connection) {
  const match = (connection?.engine || '').match(/^([^@]*)@/);
  if (match) {
    return match[1];
  }
  return connection?.engine;
}
