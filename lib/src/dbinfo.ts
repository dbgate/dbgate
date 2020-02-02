import { ChildProcess } from "child_process";

export interface NamedObjectInfo {
  pureName: string;
  schemaName: string;
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
}

export interface TableInfo extends NamedObjectInfo {
  columns: ColumnInfo[];
}

export interface DatabaseInfo {
  tables: TableInfo[];
}
