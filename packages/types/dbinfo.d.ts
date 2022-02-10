export interface NamedObjectInfo {
  pureName: string;
  schemaName?: string;
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
  constraintType: 'primaryKey' | 'foreignKey' | 'index' | 'check' | 'unique';
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
  indexType: 'normal' | 'clustered' | 'xml' | 'spatial' | 'fulltext';
}

export interface UniqueInfo extends ColumnsConstraintInfo {}

export interface CheckInfo extends ConstraintInfo {
  definition: string;
}

export interface ColumnInfo extends NamedObjectInfo {
  pairingId?: string;
  columnName: string;
  notNull: boolean;
  autoIncrement: boolean;
  dataType: string;
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
}

export interface DatabaseObjectInfo extends NamedObjectInfo {
  pairingId?: string;
  objectId?: string;
  createDate?: string;
  modifyDate?: string;
  hashCode?: string;
  objectTypeField?: string;
  obejctComment?: string;
}

export interface SqlObjectInfo extends DatabaseObjectInfo {
  createSql?: string;
  requiresFormat?: boolean; // SQL is human unreadable, requires formatting (eg. MySQL views)
}

export interface TableInfo extends DatabaseObjectInfo {
  columns: ColumnInfo[];
  primaryKey?: PrimaryKeyInfo;
  foreignKeys: ForeignKeyInfo[];
  dependencies?: ForeignKeyInfo[];
  indexes?: IndexInfo[];
  uniques?: UniqueInfo[];
  checks?: CheckInfo[];
  preloadedRows?: any[];
  preloadedRowsKey?: string[];
  preloadedRowsInsertOnly?: string[];
  tableRowCount?: number | string;
  __isDynamicStructure?: boolean;
}

export interface CollectionInfo extends DatabaseObjectInfo {}

export interface ViewInfo extends SqlObjectInfo {
  columns: ColumnInfo[];
}

export interface ProcedureInfo extends SqlObjectInfo {}

export interface FunctionInfo extends SqlObjectInfo {
  // returnDataType?: string;
}

export interface TriggerInfo extends SqlObjectInfo {}

export interface SchemaInfo {
  objectId?: string;
  schemaName: string;
}

export interface DatabaseInfoObjects {
  tables: TableInfo[];
  collections: CollectionInfo[];
  views: ViewInfo[];
  matviews: ViewInfo[];
  procedures: ProcedureInfo[];
  functions: FunctionInfo[];
  triggers: TriggerInfo[];
}

export interface DatabaseInfo extends DatabaseInfoObjects {
  schemas: SchemaInfo[];
  engine?: string;
  defaultSchema?: string;
}
