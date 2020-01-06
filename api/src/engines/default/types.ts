export interface EngineDriver {
  connect({ server, port, user, password });
  query(pool, sql: string): [];
  getVersion(pool): string;
  listDatabases(pool): [{ name: string }];
  analyseFull(pool);
  analyseIncremental(pool);
}
