import stream from 'stream';
import { QueryResult } from './query';
import { SqlDialect } from './dialect';
import { SqlDumper } from './dumper';
import { DatabaseInfo, NamedObjectInfo, TableInfo, ViewInfo, ProcedureInfo, FunctionInfo, TriggerInfo } from './dbinfo';

export interface StreamOptions {
  recordset: (columns) => void;
  row: (row) => void;
  error: (error) => void;
  done: (result) => void;
  info: (info) => void;
}

export interface WriteTableOptions {
  dropIfExists?: boolean;
  truncate?: boolean;
  createIfNotExists?: boolean;
}

export interface EngineDriver {
  engine: string;
  connect(nativeModules, { server, port, user, password, database }): any;
  query(pool: any, sql: string): Promise<QueryResult>;
  stream(pool: any, sql: string, options: StreamOptions);
  readQuery(pool: any, sql: string, structure?: TableInfo): Promise<stream.Readable>;
  writeTable(pool: any, name: NamedObjectInfo, options: WriteTableOptions): Promise<stream.Writeable>;
  analyseSingleObject(
    pool: any,
    name: NamedObjectInfo,
    objectTypeField: keyof DatabaseInfo
  ): Promise<TableInfo | ViewInfo | ProcedureInfo | FunctionInfo | TriggerInfo>;
  analyseSingleTable(pool: any, name: NamedObjectInfo): Promise<TableInfo>;
  getVersion(pool: any): Promise<{ version: string }>;
  listDatabases(
    pool: any
  ): Promise<
    {
      name: string;
    }[]
  >;
  analyseFull(pool: any): Promise<DatabaseInfo>;
  analyseIncremental(pool: any, structure: DatabaseInfo): Promise<DatabaseInfo>;
  dialect: SqlDialect;
  createDumper(): SqlDumper;
}

export interface DatabaseModification {
  oldName?: NamedObjectInfo;
  newName?: NamedObjectInfo;
  objectId: string;
  action: 'add' | 'remove' | 'change';
  objectTypeField: keyof DatabaseInfo;
}
