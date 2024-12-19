import { ColumnInfo, TableInfo, ForeignKeyInfo, DatabaseInfo } from 'dbgate-types';
import { StringNullableChain } from 'lodash';
import _cloneDeep from 'lodash/cloneDeep';
import _compact from 'lodash/compact';
import { DatabaseAnalyser } from './DatabaseAnalyser';

export interface ColumnInfoYaml {
  name: string;
  type: string;
  notNull?: boolean;
  length?: number;
  autoIncrement?: boolean;
  references?: string;
  refDeleteAction?: string;
  refUpdateAction?: string;
  primaryKey?: boolean;
  default?: string;
}

export interface DatabaseModelFile {
  name: string;
  text: string;
  json: {};
}

export interface IndexInfoYaml {
  name: string;
  unique?: boolean;
  filter?: string;
  columns: string[];
  included?: string[];
}

export interface TableInfoYaml {
  name: string;
  // schema?: string;
  columns: ColumnInfoYaml[];
  primaryKey?: string[];
  sortingKey?: string[];
  indexes?: IndexInfoYaml[];

  insertKey?: string[];
  insertOnly?: string[];
  data?: any[];
}

export interface ForeignKeyInfoYaml {
  deleteAction?: string;
}

// function foreignKeyInfoToYaml() {}

function columnInfoToYaml(column: ColumnInfo, table: TableInfo): ColumnInfoYaml {
  const res: ColumnInfoYaml = {
    name: column.columnName,
    type: column.dataType,
    default: column.defaultValue,
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
    dataType: column.length ? `${column.type}(${column.length < 0 ? 'max' : column.length})` : column.type,
    autoIncrement: column.autoIncrement,
    notNull: column.notNull || (table.primaryKey && table.primaryKey.includes(column.name)),
    defaultValue: column.default,
    defaultConstraint: column.default != null ? `DF_${table.name}_${column.name}` : undefined,
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
  if (tableCopy.sortingKey && !tableCopy.sortingKey['_dumped']) {
    res.sortingKey = tableCopy.sortingKey.columns.map(x => x.columnName);
  }
  // const foreignKeys = (tableCopy.foreignKeys || []).filter(x => !x['_dumped']).map(foreignKeyInfoToYaml);
  if (tableCopy.indexes?.length > 0) {
    res.indexes = tableCopy.indexes.map(index => {
      const idx: IndexInfoYaml = {
        name: index.constraintName,
        unique: index.isUnique,
        filter: index.filterDefinition,
        columns: index.columns.filter(x => !x.isIncludedColumn).map(x => x.columnName),
      };
      if (index.columns.some(x => x.isIncludedColumn)) {
        idx.included = index.columns.filter(x => x.isIncludedColumn).map(x => x.columnName);
      }
      return idx;
    });
  }
  return res;
}

function convertForeignKeyFromYaml(
  col: ColumnInfoYaml,
  table: TableInfoYaml,
  allTables: TableInfoYaml[]
): ForeignKeyInfo {
  const refTable = allTables.find(x => x.name == col.references);
  if (!refTable || !refTable.primaryKey) return null;
  return {
    constraintType: 'foreignKey',
    constraintName: `FK_${table.name}_${col.name}`,
    pureName: table.name,
    refTableName: col.references,
    deleteAction: col.refDeleteAction,
    updateAction: col.refUpdateAction,
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
    foreignKeys: _compact(
      table.columns.filter(x => x.references).map(col => convertForeignKeyFromYaml(col, table, allTables))
    ),
    indexes: table.indexes?.map(index => ({
      constraintName: index.name,
      pureName: table.name,
      isUnique: index.unique,
      constraintType: 'index',
      filterDefinition: index.filter,
      columns: [
        ...index.columns.map(columnName => ({ columnName })),
        ...(index.included || []).map(columnName => ({ columnName, isIncludedColumn: true })),
      ],
    })),
  };
  if (table.primaryKey) {
    res.primaryKey = {
      pureName: table.name,
      constraintType: 'primaryKey',
      constraintName: `PK_${table.name}`,
      columns: table.primaryKey.map(columnName => ({ columnName })),
    };
  }
  if (table.sortingKey) {
    res.sortingKey = {
      pureName: table.name,
      constraintType: 'sortingKey',
      constraintName: `SK_${table.name}`,
      columns: table.sortingKey.map(columnName => ({ columnName })),
    };
  }
  res.preloadedRows = table.data;
  res.preloadedRowsKey = table.insertKey;
  res.preloadedRowsInsertOnly = table.insertOnly;
  return res;
}

export function databaseInfoFromYamlModel(filesOrDbInfo: DatabaseModelFile[] | DatabaseInfo): DatabaseInfo {
  if (!Array.isArray(filesOrDbInfo)) {
    return filesOrDbInfo;
  }

  const model = DatabaseAnalyser.createEmptyStructure();
  const tablesYaml = [];

  for (const file of filesOrDbInfo) {
    if (file.name.endsWith('.table.yaml') || file.name.endsWith('.sql')) {
      if (file.name.endsWith('.table.yaml')) {
        tablesYaml.push(file.json);
      }

      if (file.name.endsWith('.view.sql')) {
        model.views.push({
          pureName: file.name.slice(0, -'.view.sql'.length),
          createSql: file.text,
          columns: [],
        });
      }

      if (file.name.endsWith('.matview.sql')) {
        model.matviews.push({
          pureName: file.name.slice(0, -'.matview.sql'.length),
          createSql: file.text,
          columns: [],
        });
      }

      if (file.name.endsWith('.proc.sql')) {
        model.procedures.push({
          pureName: file.name.slice(0, -'.proc.sql'.length),
          createSql: file.text,
        });
      }

      if (file.name.endsWith('.func.sql')) {
        model.functions.push({
          pureName: file.name.slice(0, -'.func.sql'.length),
          createSql: file.text,
        });
      }

      if (file.name.endsWith('.trigger.sql')) {
        model.triggers.push({
          objectId: `triggers:${file.name.slice(0, -'.trigger.sql'.length)}`,
          pureName: file.name.slice(0, -'.trigger.sql'.length),
          createSql: file.text,
        });
      }
    }
  }

  model.tables = tablesYaml.map(table => tableInfoFromYaml(table, tablesYaml));

  return model;
}
