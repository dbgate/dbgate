import stream from 'stream'
import { QueryResult } from './query';
import { SqlDialect } from './dialect';
import { SqlDumper } from './dumper';
import { DatabaseInfo, NamedObjectInfo } from './dbinfo';

export interface StreamOptions {
  recordset: (columns) => void;
  row: (row) => void;
  error: (error) => void;
  done: (result) => void;
  info: (info) => void;
}

export interface EngineDriver {
  engine: string;
  connect(nativeModules, { server, port, user, password, database }): any;
  query(pool: any, sql: string): Promise<QueryResult>;
  stream(pool: any, sql: string, options: StreamOptions);
  readableStream(pool: any, sql: string): Promise<stream.Readable>;
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
