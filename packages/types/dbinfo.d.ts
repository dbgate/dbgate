export interface NamedObjectInfo {
  pureName: string;
  schemaName?: string;
  contentHash?: string;
  engine?: string;
}

export interface ColumnReference {
  columnName: string;
  refColumnName?: string;
  isIncludedColumn?: boolean;
  isDescending?: boolean;
}

export interface ConstraintInfo extends NamedObjectInfo {
  pairingId?: string;
  constraintName?: string;
  constraintType: 'primaryKey' | 'foreignKey' | 'sortingKey' | 'index' | 'check' | 'unique';
}

export interface ColumnsConstraintInfo extends ConstraintInfo {
  columns: ColumnReference[];
}

export interface PrimaryKeyInfo extends ColumnsConstraintInfo {}

export interface ForeignKeyInfo extends ColumnsConstraintInfo {
  refSchemaName?: string;
  refTableName: string;
  updateAction?: string;
  deleteAction?: string;
}

export interface IndexInfo extends ColumnsConstraintInfo {
  isUnique: boolean;
  // indexType: 'normal' | 'clustered' | 'xml' | 'spatial' | 'fulltext';
  indexType?: string;
  // condition for filtered index (SQL Server)
  filterDefinition?: string;
}

export interface UniqueInfo extends ColumnsConstraintInfo {}

export interface CheckInfo extends ConstraintInfo {
  definition: string;
}

export interface ColumnInfo extends NamedObjectInfo {
  pairingId?: string;
  columnName: string;
  notNull?: boolean;
  autoIncrement?: boolean;
  dataType: string;
  displayedDataType?: string;
  precision?: number;
  scale?: number;
  length?: number;
  computedExpression?: string;
  isPersisted?: boolean;
  isSparse?: boolean;
  defaultValue?: string;
  defaultConstraint?: string;
  columnComment?: string;
  isUnsigned?: boolean;
  isZerofill?: boolean;
  options?: [];
  canSelectMultipleOptions?: boolean;
  undropColumnName?: string;
}

export interface DatabaseObjectInfo extends NamedObjectInfo {
  pairingId?: string;
  objectId?: string;
  createDate?: string;
  modifyDate?: string;
  hashCode?: string;
  objectTypeField?: string;
  objectComment?: string;
}

export interface SqlObjectInfo extends DatabaseObjectInfo {
  createSql?: string;
  requiresFormat?: boolean; // SQL is human unreadable, requires formatting (eg. MySQL views)
}

export interface TableInfo extends DatabaseObjectInfo {
  columns: ColumnInfo[];
  primaryKey?: PrimaryKeyInfo;
  sortingKey?: ColumnsConstraintInfo;
  foreignKeys: ForeignKeyInfo[];
  dependencies?: ForeignKeyInfo[];
  indexes?: IndexInfo[];
  uniques?: UniqueInfo[];
  checks?: CheckInfo[];
  preloadedRows?: any[];
  preloadedRowsKey?: string[];
  preloadedRowsInsertOnly?: string[];
  tableRowCount?: number | string;
  tableEngine?: string;
  __isDynamicStructure?: boolean;
}

export interface CollectionInfo extends DatabaseObjectInfo {
  // all known columns with definition (only used in Cassandra)
  knownColumns?: ColumnInfo[];

  // unique combination of columns (should be contatenation of partitionKey and clusterKey)
  uniqueKey?: ColumnReference[];

  // partition key columns
  partitionKey?: ColumnReference[];

  // unique key inside partition
  clusterKey?: ColumnReference[];
}

export interface ViewInfo extends SqlObjectInfo {
  columns: ColumnInfo[];
}

export type ParameterMode = 'IN' | 'OUT' | 'INOUT' | 'RETURN';

export interface ParameterInfo extends NamedObjectInfo {
  parameterName?: string;
  dataType: string;
  parameterMode?: ParameterMode;
  position?: number;
}

export interface CallableObjectInfo extends SqlObjectInfo {
  parameters?: ParameterInfo[];
}

export interface ProcedureInfo extends CallableObjectInfo {}

export interface FunctionInfo extends CallableObjectInfo {
  returnType?: string;
}

export interface TriggerInfo extends SqlObjectInfo {
  objectId: string;
  functionName?: string;
  tableName?: string;
  triggerTiming?:
    | 'BEFORE'
    | 'AFTER'
    | 'INSTEAD OF'
    | 'BEFORE EACH ROW'
    | 'INSTEAD OF'
    | 'AFTER EACH ROW'
    | 'AFTER STATEMENT'
    | 'BEFORE STATEMENT'
    | 'AFTER EVENT'
    | 'BEFORE EVENT'
    | null;
  triggerLevel?: 'ROW' | 'STATEMENT';
  eventType?: 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';
}

export interface SchedulerEventInfo extends SqlObjectInfo {
  definer: string;
  eventType: 'RECURRING' | 'ONE TIME';
  onCompletion: 'PRESERVE' | 'NOT PRESERVE';
  status: 'ENABLED' | 'DISABLED';
  lastExecuted?: string;
  intervalValue: string;
  intervalField: string;
  starts: string;
  executeAt: string;
}

export interface SchemaInfo {
  objectId?: string;
  schemaName: string;
  isDefault?: boolean;
}

export interface DatabaseInfoObjects {
  tables: TableInfo[];
  collections: CollectionInfo[];
  views: ViewInfo[];
  matviews: ViewInfo[];
  procedures: ProcedureInfo[];
  functions: FunctionInfo[];
  triggers: TriggerInfo[];
  schedulerEvents: SchedulerEventInfo[];
}

export interface DatabaseInfo extends DatabaseInfoObjects {
  engine?: string;
}

export interface ColumnReferenceTiny {
  n: string; // name
  r?: string; // ref name
}

export interface PrimaryKeyInfoTiny {
  c: ColumnReferenceTiny[]; // columns
}

export interface ForeignKeyInfoTiny {
  c: ColumnReferenceTiny[]; // columns
  r: string; // reference table name
}

export interface ColumnInfoTiny {
  n: string; // name
  t: string; // type
}

export interface TableInfoTiny {
  n: string; //name
  o: string; // comment
  c: ColumnInfoTiny[]; // columns
  p?: PrimaryKeyInfoTiny; // primary key
  f?: ForeignKeyInfoTiny[]; // foreign keys
}

export interface DatabaseInfoTiny {
  t: TableInfoTiny[]; // tables
}
