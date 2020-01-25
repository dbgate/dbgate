import { ChildProcess } from 'child_process';

export interface EngineDriver {
  connect({ server, port, user, password });
  query(pool, sql: string): Promise<any[]>;
  getVersion(pool): Promise<string>;
  listDatabases(pool): Promise<{ name: string }[]>;
  analyseFull(pool): Promise<void>;
  analyseIncremental(pool): Promise<void>;
}

export interface NamedObjectInfo {
  pureName: string;
  schemaName: string;
}  

export interface TableInfo extends NamedObjectInfo {
}

export interface DatabaseInfo {
  tables: TableInfo[];
}  

export interface OpenedDatabaseConnection {
  id: string;
  database: string;
  structure: DatabaseInfo;
  subprocess: ChildProcess;
}
