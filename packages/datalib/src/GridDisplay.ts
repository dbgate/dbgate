import _ from 'lodash';
import { GridConfig, GridCache, GridConfigColumns } from './GridConfig';
import { ForeignKeyInfo, TableInfo, ColumnInfo, DbType } from '@dbgate/types';
import { parseFilter, getFilterType } from '@dbgate/filterparser';
import { filterName } from './filterName';
import { Select, Expression } from '@dbgate/sqltree';
import { ChangeSetFieldDefinition, ChangeSetRowDefinition } from './ChangeSet';

export interface DisplayColumn {
  schemaName: string;
  pureName: string;
  columnName: string;
  headerText: string;
  uniqueName: string;
  uniquePath: string[];
  notNull: boolean;
  autoIncrement: boolean;
  isPrimaryKey: boolean;
  foreignKey: ForeignKeyInfo;
  isChecked?: boolean;
  hintColumnName?: string;
  commonType?: DbType;
}

export interface DisplayedColumnEx extends DisplayColumn {
  sourceAlias: string;
}

export interface DisplayedColumnInfo {
  [uniqueName: string]: DisplayedColumnEx;
}

export type ReferenceActionResult = 'noAction' | 'loadRequired' | 'refAdded';

export function combineReferenceActions(a: ReferenceActionResult, b: ReferenceActionResult): ReferenceActionResult {
  if (a == 'loadRequired' || b == 'loadRequired') return 'loadRequired';
  if (a == 'refAdded' || b == 'refAdded') return 'refAdded';
  return 'noAction';
}

export abstract class GridDisplay {
  constructor(
    public config: GridConfig,
    protected setConfig: (config: GridConfig) => void,
    public cache: GridCache,
    protected setCache: (config: GridCache) => void,
    protected getTableInfo: ({ schemaName, pureName }) => Promise<TableInfo>
  ) {}
  abstract getPageQuery(offset: number, count: number): string;
  columns: DisplayColumn[];
  baseTable?: TableInfo;
  changeSetKeyFields: string[] = null;
  setColumnVisibility(uniquePath: string[], isVisible: boolean) {
    const uniqueName = uniquePath.join('.');
    if (uniquePath.length == 1) {
      this.includeInColumnSet('hiddenColumns', uniqueName, !isVisible);
    } else {
      this.includeInColumnSet('addedColumns', uniqueName, isVisible);
      this.reload();
    }
  }

  reload() {
    this.setCache({
      ...this.cache,
      refreshTime: new Date().getTime(),
    });
  }

  includeInColumnSet(field: keyof GridConfigColumns, uniqueName: string, isIncluded: boolean) {
    if (isIncluded) {
      this.setConfig({
        ...this.config,
        [field]: [...(this.config[field] || []), uniqueName],
      });
    } else {
      this.setConfig({
        ...this.config,
        [field]: (this.config[field] || []).filter(x => x != uniqueName),
      });
    }
  }

  showAllColumns() {
    this.setConfig({
      ...this.config,
      hiddenColumns: [],
    });
  }

  hideAllColumns() {
    this.setConfig({
      ...this.config,
      hiddenColumns: this.columns.map(x => x.uniqueName),
    });
  }

  get hiddenColumnIndexes() {
    return (this.config.hiddenColumns || []).map(x => _.findIndex(this.columns, y => y.uniqueName == x));
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
    this.getTableInfo({ schemaName: foreignKey.refSchemaName, pureName: foreignKey.refTableName }).then(table => {
      this.setCache({
        ...this.cache,
        tables: {
          ...this.cache.tables,
          [uniqueName]: table,
        },
      });
    });
  }

  isColumnChecked(column: DisplayColumn) {
    return column.uniquePath.length == 1
      ? !this.config.hiddenColumns.includes(column.uniqueName)
      : this.config.addedColumns.includes(column.uniqueName);
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
      isPrimaryKey: table.primaryKey && !!table.primaryKey.columns.find(x => x.columnName == col.columnName),
      foreignKey:
        table.foreignKeys &&
        table.foreignKeys.find(fk => fk.columns.length == 1 && fk.columns[0].columnName == col.columnName),
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
    if ((select.from.relations || []).find(x => x.alias == childAlias)) return;
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
          const hintColumn = table.columns.find(x => x?.dataType?.toLowerCase()?.includes('char'));
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

  applyFilterOnSelect(select: Select, displayedColumnInfo: DisplayedColumnInfo) {
    for (const uniqueName in this.config.filters) {
      const filter = this.config.filters[uniqueName];
      if (!filter) continue;
      const column = displayedColumnInfo[uniqueName];
      if (!column) continue;
      try {
        const condition = parseFilter(filter, getFilterType(column.commonType?.typeCode));
        if (condition) {
          select.where = _.cloneDeepWith(condition, (expr: Expression) => {
            if (expr.exprType == 'placeholder')
              return {
                exprType: 'column',
                columnName: column.columnName,
                source: { alias: column.sourceAlias },
              };
          });
        }
      } catch (err) {
        console.warn(err.message);
        continue;
      }
    }
  }

  getDisplayColumns(table: TableInfo, parentPath: string[]) {
    return (
      table?.columns
        ?.map(col => this.getDisplayColumn(table, col, parentPath))
        ?.map(col => ({
          ...col,
          isChecked: this.isColumnChecked(col),
          hintColumnName: col.foreignKey ? `hint_${col.uniqueName}` : null,
        })) || []
    );
  }

  getColumns(columnFilter) {
    return this.enrichExpandedColumns(this.columns.filter(col => filterName(columnFilter, col.columnName)));
  }

  getGridColumns() {
    return this.getColumns(null).filter(x => this.isColumnChecked(x));
  }

  isExpandedColumn(uniqueName: string) {
    return this.config.expandedColumns.includes(uniqueName);
  }

  toggleExpandedColumn(uniqueName: string) {
    this.includeInColumnSet('expandedColumns', uniqueName, !this.isExpandedColumn(uniqueName));
  }

  getFilter(uniqueName: string) {
    return this.config.filters[uniqueName];
  }

  setFilter(uniqueName, value) {
    this.setConfig({
      ...this.config,
      filters: {
        ...this.config.filters,
        [uniqueName]: value,
      },
    });
    this.reload();
  }

  get filterCount() {
    return _.compact(_.values(this.config.filters)).length;
  }

  clearFilters() {
    this.setConfig({
      ...this.config,
      filters: {},
    });
    this.reload();
  }

  getChangeSetCondition(row) {
    if (!this.changeSetKeyFields) return null;
    return _.pick(row, this.changeSetKeyFields);
  }

  getChangeSetField(row, uniqueName): ChangeSetFieldDefinition {
    const col = this.columns.find(x => x.uniqueName == uniqueName);
    if (!col) return null;
    if (!this.baseTable) return null;
    if (this.baseTable.pureName != col.pureName || this.baseTable.schemaName != col.schemaName) return null;
    return {
      pureName: col.pureName,
      schemaName: col.schemaName,
      uniqueName: uniqueName,
      columnName: col.columnName,
      condition: this.getChangeSetCondition(row),
    };
  }

  getChangeSetRow(row): ChangeSetRowDefinition {
    if (!this.baseTable) return null;
    return {
      pureName: this.baseTable.pureName,
      schemaName: this.baseTable.schemaName,
      condition: this.getChangeSetCondition(row),
    };
  }
}
