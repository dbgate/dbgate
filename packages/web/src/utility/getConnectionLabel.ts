export default function getConnectionLabel(connection, { allowExplicitDatabase = true } = {}) {
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
    const m = connection.databaseFile.match(/[\/]([^\/]+)$/);
    if (m) return m[1];
    return connection.databaseFile;
  }
  if (connection.server) {
    return connection.server;
  }
  return '';
}
