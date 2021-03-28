export interface NamedObjectInfo {
  pureName: string;
  schemaName?: string;
}

export interface ColumnReference {
  columnName: string;
  refColumnName?: string;
}

export interface ConstraintInfo extends NamedObjectInfo {
  constraintName: string;
  constraintType: 'primaryKey' | 'foreignKey' | 'index' | 'check' | 'unique';
}

export interface ColumnsConstraintInfo extends ConstraintInfo {
  columns: ColumnReference[];
}

export interface PrimaryKeyInfo extends ColumnsConstraintInfo {}

export interface ForeignKeyInfo extends ColumnsConstraintInfo {
  refSchemaName: string;
  refTableName: string;
  updateAction: string;
  deleteAction: string;
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
  columnName: string;
  notNull: boolean;
  autoIncrement: boolean;
  dataType: string;
  precision: number;
  scale: number;
  length: number;
  computedExpression: string;
  isPersisted: boolean;
  isSparse: boolean;
  defaultValue: string;
  defaultConstraint: string;
}

export interface DatabaseObjectInfo extends NamedObjectInfo {
  objectId?: string;
  createDate?: string;
  modifyDate?: string;
  hashCode?: string;
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
  checks?: CheckInfo[];
}

export interface ViewInfo extends SqlObjectInfo {
  columns: ColumnInfo[];
}

export interface ProcedureInfo extends SqlObjectInfo {}

export interface FunctionInfo extends SqlObjectInfo {}

export interface TriggerInfo extends SqlObjectInfo {}

export interface SchemaInfo {
  objectId?: string;
  schemaName: string;
}

export interface DatabaseInfoObjects {
  tables: TableInfo[];
  views: ViewInfo[];
  procedures: ProcedureInfo[];
  functions: FunctionInfo[];
  triggers: TriggerInfo[];
}

export interface DatabaseInfo extends DatabaseInfoObjects {
  schemas: SchemaInfo[];
}
