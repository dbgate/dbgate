import { ColumnInfo, TableInfo, ForeignKeyInfo } from 'dbgate-types';
import _ from 'lodash';
import _cloneDeep from 'lodash/cloneDeep';

export interface ColumnInfoYaml {
  name: string;
  type: string;
  notNull?: boolean;
  autoIncrement?: boolean;
  references?: string;
  primaryKey?: boolean;
}

export interface TableInfoYaml {
  name: string;
  // schema?: string;
  columns: ColumnInfoYaml[];
  primaryKey?: string[];
}

export interface ForeignKeyInfoYaml {
  deleteAction?: string;
}

// function foreignKeyInfoToYaml() {}

function columnInfoToYaml(column: ColumnInfo, table: TableInfo): ColumnInfoYaml {
  const res: ColumnInfoYaml = {
    name: column.columnName,
    type: column.dataType,
  };
  if (column.autoIncrement) res.autoIncrement = true;
  if (column.notNull) res.notNull = true;

  const fk =
    table.foreignKeys &&
    table.foreignKeys.find(fk => fk.columns.length == 1 && fk.columns[0].columnName == column.columnName);
  if (
    fk &&
    // fk.refSchemaName == table.schemaName &&
    (!fk.deleteAction || fk.deleteAction == 'NO ACTION') &&
    (!fk.updateAction || fk.updateAction == 'NO ACTION')
  ) {
    res.references = fk.refTableName;
    fk['_dumped'] = true;
  }

  // if (table.primaryKey && table.primaryKey.columns.length == 1) {
  //   table.primaryKey['_dumped'] = true;
  //   res.primaryKey = true;
  // }

  return res;
}

function columnInfoFromYaml(column: ColumnInfoYaml, table: TableInfoYaml): ColumnInfo {
  const res: ColumnInfo = {
    pureName: table.name,
    columnName: column.name,
    dataType: column.type,
    autoIncrement: column.autoIncrement,
    notNull: column.notNull,
  };
  return res;
}

export function tableInfoToYaml(table: TableInfo): TableInfoYaml {
  const tableCopy = _cloneDeep(table);
  const res: TableInfoYaml = {
    name: tableCopy.pureName,
    // schema: tableCopy.schemaName,
    columns: tableCopy.columns.map(c => columnInfoToYaml(c, tableCopy)),
  };
  if (tableCopy.primaryKey && !tableCopy.primaryKey['_dumped']) {
    res.primaryKey = tableCopy.primaryKey.columns.map(x => x.columnName);
  }
  // const foreignKeys = (tableCopy.foreignKeys || []).filter(x => !x['_dumped']).map(foreignKeyInfoToYaml);
  return res;
}

function convertForeignKeyFromYaml(col: ColumnInfoYaml, table: TableInfoYaml, allTables: TableInfoYaml[]): ForeignKeyInfo {
  const refTable = allTables.find(x => x.name == col.references);
  if (!refTable || !refTable.primaryKey) return null;
  return {
    constraintType: 'foreignKey',
    pureName: table.name,
    refTableName: col.references,
    columns: [
      {
        columnName: col.name,
        refColumnName: refTable.primaryKey[0],
      },
    ],
  };
}

export function tableInfoFromYaml(table: TableInfoYaml, allTables: TableInfoYaml[]): TableInfo {
  const res: TableInfo = {
    pureName: table.name,
    columns: table.columns.map(c => columnInfoFromYaml(c, table)),
    foreignKeys: _.compact(
      table.columns.filter(x => x.references).map(col => convertForeignKeyFromYaml(col, table, allTables))
    ),
  };
  if (table.primaryKey) {
    res.primaryKey = {
      pureName: table.name,
      constraintType: 'primaryKey',
      columns: table.primaryKey.map(columnName => ({ columnName })),
    };
  }
  return res;
}
