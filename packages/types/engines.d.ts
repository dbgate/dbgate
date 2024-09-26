import stream from 'stream';
import { QueryResult } from './query';
import { SqlDialect } from './dialect';
import { SqlDumper } from './dumper';
import {
  DatabaseInfo,
  NamedObjectInfo,
  TableInfo,
  ViewInfo,
  ProcedureInfo,
  FunctionInfo,
  TriggerInfo,
  CollectionInfo,
  SchemaInfo,
} from './dbinfo';
import { FilterBehaviour } from './filter-type';

export interface StreamOptions {
  recordset: (columns) => void;
  row: (row) => void;
  error?: (error) => void;
  done?: (result) => void;
  info?: (info) => void;
}

export interface RunScriptOptions {
  useTransaction: boolean;
  queryOptions?: QueryOptions;
}

export interface QueryOptions {
  discardResult?: boolean;
  importSqlDump?: boolean;
}

export interface WriteTableOptions {
  dropIfExists?: boolean;
  truncate?: boolean;
  createIfNotExists?: boolean;
  commitAfterInsert?: boolean;
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
  condition?: any;
  aggregate?: CollectionAggregateDefinition;
  sort?: CollectionSortDefinition;
}

export interface NewObjectTemplate {
  label: string;
  sql: string;
}

export interface SupportedDbKeyType {
  name: string;
  label: string;
  dbKeyFields: { name: string }[];
  addMethod: string;
  keyColumn?: string;
  showItemList?: boolean;
}

export interface SqlBackupDumper {
  run();
}

export interface SummaryColumn {
  fieldName: string;
  header: string;
  dataType: 'string' | 'number' | 'bytes';
}
export interface ServerSummaryDatabase {}
export interface ServerSummary {
  columns: SummaryColumn[];
  databases: ServerSummaryDatabase[];
}

export type CollectionAggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max';
export interface CollectionAggregateDefinition {
  condition: any; // SQL tree condition
  groupByColumns: string[];
  aggregateColumns: {
    alias: string;
    aggregateFunction: CollectionAggregateFunction;
    columnArgument?: string;
  }[];
}

export interface CollectionSortDefinitionItem {
  columnName: string;
  direction: 'ASC' | 'DESC';
}

export type CollectionSortDefinition = CollectionSortDefinitionItem[];

export interface DataEditorTypesBehaviour {
  parseSqlNull?: boolean;
  parseJsonNull?: boolean;
  parseJsonBoolean?: boolean;
  parseNumber?: boolean;
  parseJsonArray?: boolean;
  parseJsonObject?: boolean;
  parseHexAsBuffer?: boolean;
  parseObjectIdAsDollar?: boolean;
  parseDateAsDollar?: boolean;

  explicitDataType?: boolean;
  supportNumberType?: boolean;
  supportStringType?: boolean;
  supportBooleanType?: boolean;
  supportDateType?: boolean;
  supportNullType?: boolean;
  supportJsonType?: boolean;
  supportObjectIdType?: boolean;

  supportFieldRemoval?: boolean;
}

export interface FilterBehaviourProvider {
  getFilterBehaviour(dataType: string, standardFilterBehaviours: { [id: string]: FilterBehaviour }): FilterBehaviour;
}

export interface DatabaseHandle {
  client: any;
  database?: string;
  feedback?: (message: any) => void;
  getDatabase?: () => any;
  connectionType?: string;
  treeKeySeparator?: string;
}

export interface EngineDriver extends FilterBehaviourProvider {
  engine: string;
  title: string;
  defaultPort?: number;
  databaseEngineTypes: string[];
  editorMode?: string;
  readOnlySessions: boolean;
  supportedKeyTypes: SupportedDbKeyType[];
  dataEditorTypesBehaviour: DataEditorTypesBehaviour;
  supportsDatabaseUrl?: boolean;
  supportsDatabaseDump?: boolean;
  supportsServerSummary?: boolean;
  supportsDatabaseProfiler?: boolean;
  requiresDefaultSortCriteria?: boolean;
  profilerFormatterFunction?: string;
  profilerTimestampFunction?: string;
  profilerChartAggregateFunction?: string;
  profilerChartMeasures?: { label: string; field: string }[];
  isElectronOnly?: boolean;
  supportsTransactions?: boolean;

  collectionSingularLabel?: string;
  collectionPluralLabel?: string;
  collectionNameLabel?: string;
  newCollectionFormParams?: any[];

  supportedCreateDatabase?: boolean;
  showConnectionField?: (
    field: string,
    values: any,
    {
      config: {},
    }
  ) => boolean;
  showConnectionTab?: (tab: 'ssl' | 'sshTunnel', values: any) => boolean;
  beforeConnectionSave?: (values: any) => any;
  databaseUrlPlaceholder?: string;
  defaultAuthTypeName?: string;
  defaultSocketPath?: string;
  authTypeLabel?: string;
  importExportArgs?: any[];
  connect({ server, port, user, password, database }): Promise<DatabaseHandle>;
  close(dbhan: DatabaseHandle): Promise<any>;
  query(dbhan: DatabaseHandle, sql: string, options?: QueryOptions): Promise<QueryResult>;
  stream(dbhan: DatabaseHandle, sql: string, options: StreamOptions);
  readQuery(dbhan: DatabaseHandle, sql: string, structure?: TableInfo): Promise<stream.Readable>;
  readJsonQuery(dbhan: DatabaseHandle, query: any, structure?: TableInfo): Promise<stream.Readable>;
  // eg. PostgreSQL COPY FROM stdin
  writeQueryFromStream(dbhan: DatabaseHandle, sql: string): Promise<stream.Writable>;
  writeTable(dbhan: DatabaseHandle, name: NamedObjectInfo, options: WriteTableOptions): Promise<stream.Writable>;
  analyseSingleObject(
    dbhan: DatabaseHandle,
    name: NamedObjectInfo,
    objectTypeField: keyof DatabaseInfo
  ): Promise<TableInfo | ViewInfo | ProcedureInfo | FunctionInfo | TriggerInfo>;
  analyseSingleTable(dbhan: DatabaseHandle, name: NamedObjectInfo): Promise<TableInfo>;
  getVersion(dbhan: DatabaseHandle): Promise<{ version: string }>;
  listDatabases(dbhan: DatabaseHandle): Promise<
    {
      name: string;
    }[]
  >;
  loadKeys(dbhan: DatabaseHandle, root: string, filter?: string): Promise;
  exportKeys(dbhan: DatabaseHandle, options: {}): Promise;
  loadKeyInfo(dbhan: DatabaseHandle, key): Promise;
  loadKeyTableRange(dbhan: DatabaseHandle, key, cursor, count): Promise;
  loadFieldValues(dbhan: DatabaseHandle, name: NamedObjectInfo, field: string, search: string): Promise;
  analyseFull(dbhan: DatabaseHandle, serverVersion): Promise<DatabaseInfo>;
  analyseIncremental(dbhan: DatabaseHandle, structure: DatabaseInfo, serverVersion): Promise<DatabaseInfo>;
  dialect: SqlDialect;
  dialectByVersion(version): SqlDialect;
  createDumper(options = null): SqlDumper;
  createBackupDumper(dbhan: DatabaseHandle, options): Promise<SqlBackupDumper>;
  getAuthTypes(): EngineAuthType[];
  readCollection(dbhan: DatabaseHandle, options: ReadCollectionOptions): Promise<any>;
  updateCollection(dbhan: DatabaseHandle, changeSet: any): Promise<any>;
  getCollectionUpdateScript(changeSet: any, collectionInfo: CollectionInfo): string;
  createDatabase(dbhan: DatabaseHandle, name: string): Promise;
  dropDatabase(dbhan: DatabaseHandle, name: string): Promise;
  getQuerySplitterOptions(usage: 'stream' | 'script' | 'editor'): any;
  script(dbhan: DatabaseHandle, sql: string, options?: RunScriptOptions): Promise;
  operation(dbhan: DatabaseHandle, operation: {}, options?: RunScriptOptions): Promise;
  getNewObjectTemplates(): NewObjectTemplate[];
  // direct call of dbhan.client method, only some methods could be supported, on only some drivers
  callMethod(dbhan: DatabaseHandle, method, args);
  serverSummary(dbhan: DatabaseHandle): Promise<ServerSummary>;
  summaryCommand(dbhan: DatabaseHandle, command, row): Promise<void>;
  startProfiler(dbhan: DatabaseHandle, options): Promise<any>;
  stopProfiler(dbhan: DatabaseHandle, profiler): Promise<void>;
  getRedirectAuthUrl(connection, options): Promise<{ url: string; sid: string }>;
  getAuthTokenFromCode(connection, options): Promise<string>;
  getAccessTokenFromAuth(connection, req): Promise<string | null>;
  getCollectionExportQueryScript(collection: string, condition: any, sort?: CollectionSortDefinition): string;
  getCollectionExportQueryJson(collection: string, condition: any, sort?: CollectionSortDefinition): {};
  getScriptTemplates(objectTypeField: keyof DatabaseInfo): { label: string; scriptTemplate: string }[];
  getScriptTemplateContent(scriptTemplate: string, props: any): Promise<string>;
  createSaveChangeSetScript(
    changeSet: any,
    dbinfo: DatabaseInfo,
    defaultCreator: (changeSet: any, dbinfo: DatabaseInfo) => any
  ): any[];
  // adapts table info from different source (import, other database) to be suitable for this database
  adaptTableInfo(table: TableInfo): TableInfo;
  listSchemas(dbhan: DatabaseHandle): SchemaInfo[];

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
