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

export interface QueryOptions {
  discardResult?: boolean;
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

export interface NewObjectTemplate {
  label: string;
  sql: string;
}

export interface EngineDriver {
  engine: string;
  title: string;
  defaultPort?: number;
  databaseEngineTypes: string[];
  readOnlySessions: boolean,
  supportedKeyTypes: { name: string; label: string }[];
  supportsDatabaseUrl?: boolean;
  isElectronOnly?: boolean;
  showConnectionField?: (field: string, values: any) => boolean;
  showConnectionTab?: (tab: 'ssl' | 'sshTunnel', values: any) => boolean;
  beforeConnectionSave?: (values: any) => any;
  databaseUrlPlaceholder?: string;
  defaultAuthTypeName?: string;
  importExportArgs?: any[];
  connect({ server, port, user, password, database }): Promise<any>;
  close(pool): Promise<any>;
  query(pool: any, sql: string, options?: QueryOptions): Promise<QueryResult>;
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
  loadKeys(pool, root: string): Promise;
  loadKeyInfo(pool, key): Promise;
  loadKeyTableRange(pool, key, cursor, count): Promise;
  loadFieldValues(pool: any, name: NamedObjectInfo, field: string, search: string): Promise;
  analyseFull(pool: any, serverVersion): Promise<DatabaseInfo>;
  analyseIncremental(pool: any, structure: DatabaseInfo, serverVersion): Promise<DatabaseInfo>;
  dialect: SqlDialect;
  dialectByVersion(version): SqlDialect;
  createDumper(options = null): SqlDumper;
  getAuthTypes(): EngineAuthType[];
  readCollection(pool: any, options: ReadCollectionOptions): Promise<any>;
  updateCollection(pool: any, changeSet: any): Promise<any>;
  getCollectionUpdateScript(changeSet: any): string;
  createDatabase(pool: any, name: string): Promise;
  getQuerySplitterOptions(usage: 'stream' | 'script'): any;
  script(pool: any, sql: string): Promise;
  getNewObjectTemplates(): NewObjectTemplate[];
  // direct call of pool method, only some methods could be supported, on only some drivers
  callMethod(pool, method, args);

  analyserClass?: any;
  dumperClass?: any;
}

export interface DatabaseModification {
  oldName?: NamedObjectInfo;
  newName?: NamedObjectInfo;
  objectId?: string;
  action: 'add' | 'remove' | 'change' | 'all';
  objectTypeField: keyof DatabaseInfo;
}
