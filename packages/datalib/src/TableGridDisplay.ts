import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, DisplayColumn, DisplayedColumnInfo, ChangeConfigFunc } from './GridDisplay';
import { TableInfo, EngineDriver, ViewInfo, ColumnInfo, NamedObjectInfo, DatabaseInfo } from '@dbgate/types';
import { GridConfig, GridCache, createGridCache } from './GridConfig';
import { Expression, Select, treeToSql, dumpSqlSelect } from '@dbgate/sqltree';
import { filterName } from './filterName';

export class TableGridDisplay extends GridDisplay {
  public table: TableInfo;

  constructor(
    public tableName: NamedObjectInfo,
    driver: EngineDriver,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    dbinfo: DatabaseInfo
  ) {
    super(config, setConfig, cache, setCache, driver, dbinfo);

    this.table = this.findTable(tableName);
    if (!this.table) {
      this.isLoadedCorrectly = false;
    } else {
      if (!this.table.columns || this.table.columns.length == 0) {
        this.isLoadedCorrectly = false;
      }
    }

    this.columns = this.getDisplayColumns(this.table, []);
    this.filterable = true;
    this.sortable = true;
    this.editable = true;
    this.baseTable = this.table;
    if (this.table && this.table.columns) {
      this.changeSetKeyFields = this.table.primaryKey
        ? this.table.primaryKey.columns.map((x) => x.columnName)
        : this.table.columns.map((x) => x.columnName);
    }
  }

  findTable({ schemaName, pureName }) {
    return (
      this.dbinfo &&
      this.dbinfo.tables &&
      this.dbinfo.tables.find((x) => x.pureName == pureName && x.schemaName == schemaName)
    );
  }

  getDisplayColumns(table: TableInfo, parentPath: string[]) {
    return (
      table?.columns
        ?.map((col) => this.getDisplayColumn(table, col, parentPath))
        ?.map((col) => ({
          ...col,
          isChecked: this.isColumnChecked(col),
          hintColumnName: col.foreignKey ? `hint_${col.uniqueName}` : null,
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
    if ((select.from.relations || []).find((x) => x.alias == childAlias)) return;
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
                columnName: table.primaryKey.columns[0].columnName,
                source: { name: table, alias: childAlias },
              },
            },
          ],
        },
      ];
    }
  }

  addHintsToSelect(select: Select): boolean {
    let res = false;
    const groupColumns = this.groupColumns;
    for (const column of this.getGridColumns()) {
      if (column.foreignKey) {
        if (groupColumns && !groupColumns.includes(column.uniqueName)) {
          continue;
        }
        const table = this.getFkTarget(column);
        if (table && table.columns && table.columns.length > 0 && table.primaryKey) {
          const hintColumn = table.columns.find((x) => x?.dataType?.toLowerCase()?.includes('char'));
          if (hintColumn) {
            const parentUniqueName = column.uniquePath.slice(0, -1).join('.');
            this.addReferenceToSelect(select, parentUniqueName ? `${parentUniqueName}_ref` : 'basetbl', column);
            const childAlias = `${column.uniqueName}_ref`;
            select.columns.push({
              exprType: 'column',
              columnName: hintColumn.columnName,
              alias: `hint_${column.uniqueName}`,
              source: { alias: childAlias },
            });
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
    const { uniqueName, foreignKey } = column;
    const pureName = foreignKey.refTableName;
    const schemaName = foreignKey.refSchemaName;
    return this.findTable({ schemaName, pureName });
  }

  processReferences(select: Select, displayedColumnInfo: DisplayedColumnInfo) {
    this.addJoinsFromExpandedColumns(select, this.columns, 'basetbl', displayedColumnInfo);
    this.addHintsToSelect(select);
  }

  createSelect() {
    if (!this.table) return null;
    const select = this.createSelectBase(this.table, this.table.columns);
    return select;
  }

  getColumns(columnFilter) {
    return this.enrichExpandedColumns(this.columns.filter((col) => filterName(columnFilter, col.columnName)));
  }

  getDisplayColumn(table: TableInfo, col: ColumnInfo, parentPath: string[]) {
    const uniquePath = [...parentPath, col.columnName];
    const uniqueName = uniquePath.join('.');
    // console.log('this.config.addedColumns', this.config.addedColumns, uniquePath);
    return {
      ...col,
      pureName: table.pureName,
      schemaName: table.schemaName,
      headerText: uniquePath.length == 1 ? col.columnName : `${table.pureName}.${col.columnName}`,
      uniqueName,
      uniquePath,
      isPrimaryKey: table.primaryKey && !!table.primaryKey.columns.find((x) => x.columnName == col.columnName),
      foreignKey:
        table.foreignKeys &&
        table.foreignKeys.find((fk) => fk.columns.length == 1 && fk.columns[0].columnName == col.columnName),
    };
  }

  addAddedColumnsToSelect(
    select: Select,
    columns: DisplayColumn[],
    parentAlias: string,
    displayedColumnInfo: DisplayedColumnInfo
  ) {
    for (const column of columns) {
      if (this.config.addedColumns.includes(column.uniqueName)) {
        select.columns.push({
          exprType: 'column',
          columnName: column.columnName,
          alias: column.uniqueName,
          source: { name: column, alias: parentAlias },
        });
        displayedColumnInfo[column.uniqueName] = {
          ...column,
          sourceAlias: parentAlias,
        };
      }
    }
  }
}
