import _ from 'lodash';
import {
  GridDisplay,
  combineReferenceActions,
  ChangeCacheFunc,
  DisplayColumn,
  ReferenceActionResult,
  DisplayedColumnInfo,
} from './GridDisplay';
import { TableInfo, EngineDriver, ViewInfo, ColumnInfo } from '@dbgate/types';
import { GridConfig, GridCache } from './GridConfig';
import { Expression, Select, treeToSql, dumpSqlSelect } from '@dbgate/sqltree';
import { filterName } from './filterName';

export class TableGridDisplay extends GridDisplay {
  constructor(
    public table: TableInfo,
    driver: EngineDriver,
    config: GridConfig,
    setConfig: (config: GridConfig) => void,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    protected getTableInfo: ({ schemaName, pureName }) => Promise<TableInfo>
  ) {
    super(config, setConfig, cache, setCache, driver);
    this.columns = this.getDisplayColumns(table, []);
    this.filterable = true;
    this.sortable = true;
    this.editable = true;
    this.baseTable = table;
    if (table && table.columns) {
      this.changeSetKeyFields = table.primaryKey
        ? table.primaryKey.columns.map((x) => x.columnName)
        : table.columns.map((x) => x.columnName);
    }
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

  addJoinsFromExpandedColumns(
    select: Select,
    columns: DisplayColumn[],
    parentAlias: string,
    columnSources
  ): ReferenceActionResult {
    let res: ReferenceActionResult = 'noAction';
    for (const column of columns) {
      if (this.isExpandedColumn(column.uniqueName)) {
        const table = this.cache.tables[column.uniqueName];
        if (table) {
          const childAlias = `${column.uniqueName}_ref`;
          const subcolumns = this.getDisplayColumns(table, column.uniquePath);
          const tableAction = combineReferenceActions(
            this.addJoinsFromExpandedColumns(select, subcolumns, childAlias, columnSources),
            this.addAddedColumnsToSelect(select, subcolumns, childAlias, columnSources)
          );

          if (tableAction == 'refAdded') {
            this.addReferenceToSelect(select, parentAlias, column);
            res = 'refAdded';
          }
          if (tableAction == 'loadRequired') {
            return 'loadRequired';
          }
        } else {
          this.requireFkTarget(column);
          res = 'loadRequired';
        }
      }
    }
    return res;
    // const addedColumns = this.getGridColumns().filter(x=>x.)
  }

  addReferenceToSelect(select: Select, parentAlias: string, column: DisplayColumn) {
    const childAlias = `${column.uniqueName}_ref`;
    if ((select.from.relations || []).find((x) => x.alias == childAlias)) return;
    const table = this.cache.tables[column.uniqueName];
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

  addHintsToSelect(select: Select): ReferenceActionResult {
    let res: ReferenceActionResult = 'noAction';
    for (const column of this.getGridColumns()) {
      if (column.foreignKey) {
        const table = this.cache.tables[column.uniqueName];
        if (table) {
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
            res = 'refAdded';
          }
        } else {
          this.requireFkTarget(column);
          res = 'loadRequired';
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
    const table = this.cache.tables[column.uniqueName];
    if (table) {
      return this.enrichExpandedColumns(this.getDisplayColumns(table, column.uniquePath));
    } else {
      // load expanded columns
      this.requireFkTarget(column);
    }
    return [];
  }

  requireFkTarget(column: DisplayColumn) {
    const { uniqueName, foreignKey } = column;
    const pureName = foreignKey.refTableName;
    const schemaName = foreignKey.refSchemaName;
    if (this.cache.loadingTables.find((x) => x.pureName == pureName && x.schemaName == schemaName)) return;

    this.setCache((cache) => ({
      ...cache,
      loadingTables: [...cache.loadingTables, { schemaName, pureName }],
    }));

    this.getTableInfo({ schemaName, pureName }).then((table) => {
      console.log('Loading table info', schemaName, pureName);
      this.setCache((cache) => ({
        ...cache,
        loadingTables: cache.loadingTables.filter((x) => x.schemaName != schemaName || x.pureName != pureName),
        tables: {
          ...cache.tables,
          [uniqueName]: table,
        },
      }));
    });
  }

  processReferences(select: Select, displayedColumnInfo: DisplayedColumnInfo): ReferenceActionResult {
    const action = combineReferenceActions(
      this.addJoinsFromExpandedColumns(select, this.columns, 'basetbl', displayedColumnInfo),
      this.addHintsToSelect(select)
    );
    return action;
  }

  createSelect() {
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
  ): ReferenceActionResult {
    let res: ReferenceActionResult = 'noAction';
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
        res = 'refAdded';
      }
    }
    return res;
  }
}
