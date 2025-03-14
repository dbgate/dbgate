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
  logScriptItems?: boolean;
  queryOptions?: QueryOptions;
}

export interface QueryOptions {
  discardResult?: boolean;
  importSqlDump?: boolean;
  range?: { offset: number; limit: number };
}

export interface WriteTableOptions {
  dropIfExists?: boolean;
  truncate?: boolean;
  createIfNotExists?: boolean;
  commitAfterInsert?: boolean;
  targetTableStructure?: TableInfo;
  progressName?: string;
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

export interface DatabaseHandle<TClient = any> {
  client: TClient;
  database?: string;
  feedback?: (message: any) => void;
  getDatabase?: () => any;
  connectionType?: string;
  treeKeySeparator?: string;
}

export type StreamResult = stream.Readable | (stream.Readable | stream.Writable)[];

export interface CommandLineDefinition {
  command: string;
  args: string[];
  env?: { [key: string]: string };
  stdinFilePath?: string;
}

interface BackupRestoreSettingsBase {
  database: string;
  options?: { [key: string]: string };
  argsFormat: 'shell' | 'spawn';
}

export interface BackupDatabaseSettings extends BackupRestoreSettingsBase {
  outputFile: string;
  selectedTables?: { pureName: string; schemaName?: string }[];
  skippedTables?: { pureName: string; schemaName?: string }[];
}

export interface RestoreDatabaseSettings extends BackupRestoreSettingsBase {
  inputFile: string;
}

export interface EngineDriver<TClient = any> extends FilterBehaviourProvider {
  engine: string;
  title: string;
  defaultPort?: number;
  databaseEngineTypes: string[];
  editorMode?: string;
  readOnlySessions: boolean;
  supportedKeyTypes: SupportedDbKeyType[];
  dataEditorTypesBehaviour: DataEditorTypesBehaviour;
  supportsDatabaseUrl?: boolean;
  supportsDatabaseBackup?: boolean;
  supportsDatabaseRestore?: boolean;
  supportsServerSummary?: boolean;
  supportsDatabaseProfiler?: boolean;
  requiresDefaultSortCriteria?: boolean;
  profilerFormatterFunction?: string;
  profilerTimestampFunction?: string;
  profilerChartAggregateFunction?: string;
  profilerChartMeasures?: { label: string; field: string }[];
  // isElectronOnly?: boolean;
  supportsTransactions?: boolean;
  implicitTransactions?: boolean; // transaction is started with first SQL command, no BEGIN TRANSACTION is needed
  premiumOnly?: boolean;

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
  authTypeFirst?: boolean;
  defaultLocalDataCenter?: string;
  defaultSocketPath?: string;
  authTypeLabel?: string;
  importExportArgs?: any[];
  connect({ server, port, user, password, database }): Promise<DatabaseHandle<TClient>>;
  close(dbhan: DatabaseHandle<TClient>): Promise<any>;
  query(dbhan: DatabaseHandle<TClient>, sql: string, options?: QueryOptions): Promise<QueryResult>;
  stream(dbhan: DatabaseHandle<TClient>, sql: string, options: StreamOptions);
  readQuery(dbhan: DatabaseHandle<TClient>, sql: string, structure?: TableInfo): Promise<StreamResult>;
  readJsonQuery(dbhan: DatabaseHandle<TClient>, query: any, structure?: TableInfo): Promise<StreamResult>;
  // eg. PostgreSQL COPY FROM stdin
  writeQueryFromStream(dbhan: DatabaseHandle<TClient>, sql: string): Promise<StreamResult>;
  writeTable(dbhan: DatabaseHandle<TClient>, name: NamedObjectInfo, options: WriteTableOptions): Promise<StreamResult>;
  analyseSingleObject(
    dbhan: DatabaseHandle<TClient>,
    name: NamedObjectInfo,
    objectTypeField: keyof DatabaseInfo
  ): Promise<TableInfo | ViewInfo | ProcedureInfo | FunctionInfo | TriggerInfo>;
  analyseSingleTable(dbhan: DatabaseHandle<TClient>, name: NamedObjectInfo): Promise<TableInfo>;
  getVersion(dbhan: DatabaseHandle<TClient>): Promise<{ version: string; versionText?: string }>;
  listDatabases(dbhan: DatabaseHandle<TClient>): Promise<
    {
      name: string;
    }[]
  >;
  loadKeys(dbhan: DatabaseHandle<TClient>, root: string, filter?: string): Promise;
  exportKeys(dbhan: DatabaseHandle<TClient>, options: {}): Promise;
  loadKeyInfo(dbhan: DatabaseHandle<TClient>, key): Promise;
  loadKeyTableRange(dbhan: DatabaseHandle<TClient>, key, cursor, count): Promise;
  loadFieldValues(
    dbhan: DatabaseHandle<TClient>,
    name: NamedObjectInfo,
    field: string,
    search: string,
    dataType: string
  ): Promise;
  analyseFull(dbhan: DatabaseHandle<TClient>, serverVersion): Promise<DatabaseInfo>;
  analyseIncremental(dbhan: DatabaseHandle<TClient>, structure: DatabaseInfo, serverVersion): Promise<DatabaseInfo>;
  dialect: SqlDialect;
  dialectByVersion(version): SqlDialect;
  createDumper(options = null): SqlDumper;
  createBackupDumper(dbhan: DatabaseHandle<TClient>, options): Promise<SqlBackupDumper>;
  getAuthTypes(): EngineAuthType[];
  readCollection(dbhan: DatabaseHandle<TClient>, options: ReadCollectionOptions): Promise<any>;
  updateCollection(dbhan: DatabaseHandle<TClient>, changeSet: any): Promise<any>;
  getCollectionUpdateScript(changeSet: any, collectionInfo: CollectionInfo): string;
  createDatabase(dbhan: DatabaseHandle<TClient>, name: string): Promise;
  dropDatabase(dbhan: DatabaseHandle<TClient>, name: string): Promise;
  getQuerySplitterOptions(usage: 'stream' | 'script' | 'editor' | 'import'): any;
  script(dbhan: DatabaseHandle<TClient>, sql: string, options?: RunScriptOptions): Promise;
  operation(dbhan: DatabaseHandle<TClient>, operation: {}, options?: RunScriptOptions): Promise;
  getNewObjectTemplates(): NewObjectTemplate[];
  // direct call of dbhan.client method, only some methods could be supported, on only some drivers
  callMethod(dbhan: DatabaseHandle<TClient>, method, args);
  serverSummary(dbhan: DatabaseHandle<TClient>): Promise<ServerSummary>;
  summaryCommand(dbhan: DatabaseHandle<TClient>, command, row): Promise<void>;
  startProfiler(dbhan: DatabaseHandle<TClient>, options): Promise<any>;
  stopProfiler(dbhan: DatabaseHandle<TClient>, profiler): Promise<void>;
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
    defaultCreator: (changeSet: any, dbinfo: DatabaseInfo, dialect: SqlDialect) => any
  ): any[];
  // adapts table info from different source (import, other database) to be suitable for this database
  adaptTableInfo(table: TableInfo): TableInfo;
  // simple data type adapter
  adaptDataType(dataType: string): string;
  listSchemas(dbhan: DatabaseHandle<TClient>): SchemaInfo[];
  backupDatabaseCommand(
    connection: any,
    settings: BackupDatabaseSettings,
    externalTools: { [tool: string]: string }
  ): CommandLineDefinition;
  restoreDatabaseCommand(
    connection: any,
    settings: RestoreDatabaseSettings,
    externalTools: { [tool: string]: string }
  ): CommandLineDefinition;
  transformNativeCommandMessage(
    message: {
      message: string;
      severity: 'info' | 'error';
    },
    command: 'backup' | 'restore'
  ): { message: string; severity: 'info' | 'error' | 'debug' } | null;
  getNativeOperationFormArgs(operation: 'backup' | 'restore'): any[];

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
