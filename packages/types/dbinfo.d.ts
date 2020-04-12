import { DbType } from './dbtypes';

export interface NamedObjectInfo {
  pureName: string;
  schemaName: string;
}

export interface ColumnReference {
  columnName: string;
  refColumnName?: string;
}

export interface ConstraintInfo extends NamedObjectInfo {
  constraintName: string;
  constraintType: string;
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

export interface ColumnInfo {
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
  commonType?: DbType;
}

export interface DatabaseObjectInfo extends NamedObjectInfo {
  objectId?: string;
  createDate?: string;
  modifyDate?: string;
}

export interface SqlObjectInfo extends DatabaseObjectInfo {
  createSql?: string;
}

export interface TableInfo extends DatabaseObjectInfo {
  columns: ColumnInfo[];
  primaryKey?: PrimaryKeyInfo;
  foreignKeys: ForeignKeyInfo[];
  dependencies?: ForeignKeyInfo[];
}

export interface ViewInfo extends SqlObjectInfo {}

export interface ProcedureInfo extends SqlObjectInfo {}

export interface FunctionInfo extends SqlObjectInfo {}

export interface TriggerInfo extends SqlObjectInfo {}

export interface DatabaseInfo {
  tables: TableInfo[];
  views: ViewInfo[];
  procedures: ProcedureInfo[];
  functions: FunctionInfo[];
  triggers: TriggerInfo[];
}
