export interface EngineDriver {
  connect({ server, port, user, password });
  query(pool, sql: string): Promise<any[]>;
  getVersion(pool): Promise<string>;
  listDatabases(pool): Promise<{ name: string }[]>;
  analyseFull(pool): Promise<void>;
  analyseIncremental(pool): Promise<void>;
}

// export interface NameWithSchema {
//   schema: string;  
//   name: string;
// }  

export interface TableInfo {
  // name: NameWithSchema;
  tableName: string;
  schemaName: string;
}

export interface DatabaseInfo {
  tables: TableInfo[];
}  

export interface OpenedDatabaseConnection {
  id: string;
  database: string;
  structure: DatabaseInfo;
}