import stream from 'stream';
import { QueryResult } from './query';
import { SqlDialect } from './dialect';
import { SqlDumper } from './dumper';
import { DatabaseInfo, NamedObjectInfo, TableInfo, ViewInfo, ProcedureInfo, FunctionInfo, TriggerInfo } from './dbinfo';

export interface StreamOptions {
  recordset: (columns) => void;
  row: (row) => void;
  error?: (error) => void;
  done?: (result) => void;
  info?: (info) => void;
}

export interface WriteTableOptions {
  dropIfExists?: boolean;
  truncate?: boolean;
  createIfNotExists?: boolean;
}

export interface EngineAuthType {
  title: string;
  name: string;
  disabledFields: string[];
}

export interface ReadCollectionOptions {
  pureName: string;
  schemaName?: string;

  countDocuments?: boolean;
  skip?: number;
  limit?: number;
}

export interface EngineDriver {
  engine: string;
  title: string;
  defaultPort?: number;
  supportsDatabaseUrl?: boolean;
  isFileDatabase?: boolean;
  databaseUrlPlaceholder?: string;
  connect({ server, port, user, password, database }): any;
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
  dialectByVersion(version): SqlDialect;
  createDumper(): SqlDumper;
  getAuthTypes(): EngineAuthType[];
  readCollection(pool: any, options: ReadCollectionOptions): Promise<any>;
  updateCollection(pool: any, changeSet: any): Promise<any>;
  getCollectionUpdateScript(changeSet: any): string;
  createDatabase(pool: any, name: string): Promise;

  analyserClass?: any;
  dumperClass?: any;
}

export interface DatabaseModification {
  oldName?: NamedObjectInfo;
  newName?: NamedObjectInfo;
  objectId?: string;
  action: 'add' | 'remove' | 'change';
  objectTypeField: keyof DatabaseInfo;
}
