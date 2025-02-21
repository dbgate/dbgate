import _ from 'lodash';
import { filterName, isTableColumnUnique } from 'dbgate-tools';
import { GridDisplay, ChangeCacheFunc, DisplayColumn, DisplayedColumnInfo, ChangeConfigFunc } from './GridDisplay';
import type {
  TableInfo,
  EngineDriver,
  ViewInfo,
  ColumnInfo,
  NamedObjectInfo,
  DatabaseInfo,
  ForeignKeyInfo,
} from 'dbgate-types';
import { GridConfig, GridCache, createGridCache } from './GridConfig';
import { Expression, Select, treeToSql, dumpSqlSelect, ColumnRefExpression } from 'dbgate-sqltree';

export interface DictionaryDescription {
  expression: string;
  columns: string[];
  delimiter: string;
}

export type DictionaryDescriptionFunc = (table: TableInfo) => DictionaryDescription;

export class TableGridDisplay extends GridDisplay {
  public table: TableInfo;
  public addAllExpandedColumnsToSelected = false;
  public hintBaseColumns: DisplayColumn[];

  constructor(
    public tableName: NamedObjectInfo,
    driver: EngineDriver,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    dbinfo: DatabaseInfo,
    public displayOptions: any,
    serverVersion,
    public getDictionaryDescription: DictionaryDescriptionFunc = null,
    isReadOnly = false,
    public isRawMode = false
  ) {
    super(config, setConfig, cache, setCache, driver, dbinfo, serverVersion);

    this.table = this.findTable(tableName);
    if (!this.table) {
      this.isLoadedCorrectly = false;
    } else {
      if (!this.table.columns || this.table.columns.length == 0) {
        this.isLoadedCorrectly = false;
      }
    }

    this.columns = this.getDisplayColumns(this.table, []);
    this.addFormDisplayColumns(this.getDisplayColumns(this.table, []));
    this.filterable = true;
    this.sortable = true;
    this.groupable = true;
    this.editable = !isReadOnly;
    this.supportsReload = true;
    this.baseTable = this.table;
    if (this.table && this.table.columns) {
      this.changeSetKeyFields = this.table.primaryKey
        ? this.table.primaryKey.columns.map(x => x.columnName)
        : this.table.columns.map(x => x.columnName);
    }

    if (this.config.isFormView) {
      this.addAllExpandedColumnsToSelected = true;
      this.hintBaseColumns = this.formColumns;
    }
  }

  addFormDisplayColumns(columns) {
    for (const col of columns) {
      this.formColumns.push(col);
      if (this.isExpandedColumn(col.uniqueName)) {
        const table = this.getFkTarget(col);
        if (table) {
          const subcolumns = this.getDisplayColumns(table, col.uniquePath);
          this.addFormDisplayColumns(subcolumns);
        }
      }
    }
  }

  findTable({ schemaName = undefined, pureName }) {
    return (
      this.dbinfo &&
      this.dbinfo.tables &&
      this.dbinfo.tables.find(x => x.pureName == pureName && x.schemaName == schemaName)
    );
  }

  getDisplayColumns(table: TableInfo, parentPath: string[]) {
    return (
      table?.columns
        ?.map(col => this.getDisplayColumn(table, col, parentPath))
        ?.map(col => ({
          ...col,
          isChecked: this.isColumnChecked(col),
          hintColumnNames:
            this.getFkDictionaryDescription(col.isForeignKeyUnique ? col.foreignKey : null)?.columns?.map(
              columnName => `hint_${col.uniqueName}_${columnName}`
            ) || null,
          hintColumnDelimiter: this.getFkDictionaryDescription(col.isForeignKeyUnique ? col.foreignKey : null)
            ?.delimiter,
          isExpandable: !!col.foreignKey,
        })) || []
    );
  }

  addJoinsFromExpandedColumns(select: Select, columns: DisplayColumn[], parentAlias: string, columnSources) {
    for (const column of columns) {
      if (this.isExpandedColumn(column.uniqueName)) {
        const table = this.getFkTarget(column);
        if (table) {
          const childAlias = `${column.uniqueName}_ref`;
          const subcolumns = this.getDisplayColumns(table, column.uniquePath);

          this.addReferenceToSelect(select, parentAlias, column);

          this.addJoinsFromExpandedColumns(select, subcolumns, childAlias, columnSources);
          this.addAddedColumnsToSelect(select, subcolumns, childAlias, columnSources);
        }
      }
    }
  }

  addReferenceToSelect(select: Select, parentAlias: string, column: DisplayColumn) {
    const childAlias = `${column.uniqueName}_ref`;
    if ((select.from.relations || []).find(x => x.alias == childAlias)) return;
    const table = this.getFkTarget(column);
    if (table && table.primaryKey) {
      select.from.relations = [
        ...(select.from.relations || []),
        {
          joinType: 'LEFT JOIN',
          name: table,
          alias: childAlias,
          conditions: [
            {
              conditionType: 'binary',
              operator: '=',
              left: {
                exprType: 'column',
                columnName: column.columnName,
                source: { name: column, alias: parentAlias },
              },
              right: {
                exprType: 'column',
                columnName:
                  column.foreignKey?.columns?.[0]?.refColumnName ?? table.primaryKey?.columns?.[0]?.columnName,
                source: { name: table, alias: childAlias },
              },
            },
          ],
        },
      ];
    }
  }

  getFkDictionaryDescription(foreignKey: ForeignKeyInfo) {
    if (!foreignKey) return null;
    const pureName = foreignKey.refTableName;
    const schemaName = foreignKey.refSchemaName;
    const table = this.findTable({ schemaName, pureName });

    if (table && table.columns && table.columns.length > 0 && table.primaryKey) {
      const hintDescription = this.getDictionaryDescription(table);
      return hintDescription;
    }
    return null;
  }

  addHintsToSelect(select: Select): boolean {
    if (this.isRawMode) {
      return false;
    }
    let res = false;
    const groupColumns = this.groupColumns;
    for (const column of this.hintBaseColumns || this.getGridColumns()) {
      if (column.foreignKey) {
        if (groupColumns && !groupColumns.includes(column.uniqueName)) {
          continue;
        }
        const table = this.getFkTarget(column);
        if (table && table.columns && table.columns.length > 0 && table.primaryKey) {
          // const hintColumn = table.columns.find(x => x?.dataType?.toLowerCase()?.includes('char'));
          const hintDescription = this.getDictionaryDescription(table);
          if (hintDescription) {
            const parentUniqueName = column.uniquePath.slice(0, -1).join('.');
            this.addReferenceToSelect(select, parentUniqueName ? `${parentUniqueName}_ref` : 'basetbl', column);
            const childAlias = `${column.uniqueName}_ref`;
            select.columns.push(
              ...hintDescription.columns.map(
                columnName =>
                  ({
                    exprType: 'column',
                    columnName,
                    alias: `hint_${column.uniqueName}_${columnName}`,
                    source: { alias: childAlias },
                  } as ColumnRefExpression)
              )
            );
            res = true;
          }
        }
      }
    }
    return res;
  }

  enrichExpandedColumns(list: DisplayColumn[]): DisplayColumn[] {
    const res = [];
    for (const item of list) {
      res.push(item);
      if (this.isExpandedColumn(item.uniqueName)) res.push(...this.getExpandedColumns(item));
    }
    return res;
  }

  getExpandedColumns(column: DisplayColumn) {
    const table = this.getFkTarget(column);
    if (table) {
      return this.enrichExpandedColumns(this.getDisplayColumns(table, column.uniquePath));
    }
    return [];
  }

  getFkTarget(column: DisplayColumn) {
    const { uniqueName, foreignKey, isForeignKeyUnique } = column;
    if (!isForeignKeyUnique) return null;
    const pureName = foreignKey.refTableName;
    const schemaName = foreignKey.refSchemaName;
    return this.findTable({ schemaName, pureName });
  }

  processReferences(select: Select, displayedColumnInfo: DisplayedColumnInfo, options) {
    this.addJoinsFromExpandedColumns(select, this.columns, 'basetbl', displayedColumnInfo);
    if (!options.isExport && this.displayOptions.showHintColumns) {
      this.addHintsToSelect(select);
    }
  }

  createSelect(options = {}) {
    if (!this.table) return null;
    const select = this.createSelectBase(this.table, this.table.columns, options);
    return select;
  }

  getColumns(columnFilter) {
    return this.enrichExpandedColumns(this.columns.filter(col => filterName(columnFilter, col.columnName)));
  }

  getDisplayColumn(table: TableInfo, col: ColumnInfo, parentPath: string[]) {
    const uniquePath = [...parentPath, col.columnName];
    const uniqueName = uniquePath.join('.');
    // console.log('this.config.addedColumns', this.config.addedColumns, uniquePath);
    const res = {
      ...col,
      pureName: table.pureName,
      schemaName: table.schemaName,
      headerText: uniquePath.length == 1 ? col.columnName : `${table.pureName}.${col.columnName}`,
      uniqueName,
      uniquePath,
      isPrimaryKey: table.primaryKey && !!table.primaryKey.columns.find(x => x.columnName == col.columnName),
      foreignKey:
        table.foreignKeys &&
        table.foreignKeys.find(fk => fk.columns.length == 1 && fk.columns[0].columnName == col.columnName),
      isForeignKeyUnique: false,
    };

    if (res.foreignKey) {
      const refTableInfo = this.dbinfo.tables.find(
        x => x.schemaName == res.foreignKey.refSchemaName && x.pureName == res.foreignKey.refTableName
      );
      if (
        refTableInfo &&
        res.foreignKey.columns.length == 1 &&
        isTableColumnUnique(refTableInfo, res.foreignKey.columns[0].refColumnName)
      ) {
        res.isForeignKeyUnique = true;
      }
    }

    return res;
  }

  addAddedColumnsToSelect(
    select: Select,
    columns: DisplayColumn[],
    parentAlias: string,
    displayedColumnInfo: DisplayedColumnInfo
  ) {
    for (const column of columns) {
      if (this.addAllExpandedColumnsToSelected || this.config.addedColumns.includes(column.uniqueName)) {
        select.columns.push(
          this.createColumnExpression(column, { name: column, alias: parentAlias }, column.uniqueName, 'view')
        );
        displayedColumnInfo[column.uniqueName] = {
          ...column,
          sourceAlias: parentAlias,
        };
      }
    }
  }

  get hasReferences() {
    if (!this.table) return false;
    if (this.table.foreignKeys && this.table.foreignKeys.length > 0) return true;
    if (this.table.dependencies && this.table.dependencies.length > 0) return true;
    return false;
  }
}
