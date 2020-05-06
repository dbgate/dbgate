import _ from 'lodash';
import { GridConfig, GridCache, GridConfigColumns, createGridCache } from './GridConfig';
import { ForeignKeyInfo, TableInfo, ColumnInfo, DbType, EngineDriver, NamedObjectInfo } from '@dbgate/types';
import { parseFilter, getFilterType } from '@dbgate/filterparser';
import { filterName } from './filterName';
import { ChangeSetFieldDefinition, ChangeSetRowDefinition } from './ChangeSet';
import { Expression, Select, treeToSql, dumpSqlSelect } from '@dbgate/sqltree';

export interface DisplayColumn {
  schemaName: string;
  pureName: string;
  columnName: string;
  headerText: string;
  uniqueName: string;
  uniquePath: string[];
  notNull: boolean;
  autoIncrement?: boolean;
  isPrimaryKey?: boolean;
  foreignKey?: ForeignKeyInfo;
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

export type ChangeCacheFunc = (changeFunc: (config: GridCache) => GridCache) => void;

export abstract class GridDisplay {
  constructor(
    public config: GridConfig,
    protected setConfig: (config: GridConfig) => void,
    public cache: GridCache,
    protected setCache: ChangeCacheFunc,
    public driver?: EngineDriver
  ) {}
  columns: DisplayColumn[];
  baseTable?: TableInfo;
  changeSetKeyFields: string[] = null;
  sortable = false;
  filterable = false;
  editable = false;

  setColumnVisibility(uniquePath: string[], isVisible: boolean) {
    const uniqueName = uniquePath.join('.');
    if (uniquePath.length == 1) {
      this.includeInColumnSet('hiddenColumns', uniqueName, !isVisible);
    } else {
      this.includeInColumnSet('addedColumns', uniqueName, isVisible);
      this.reload();
    }
  }

  focusColumn(uniqueName: string) {
    this.setConfig({
      ...this.config,
      focusedColumn: uniqueName,
    });
  }

  get focusedColumn() {
    return this.config.focusedColumn;
  }

  get engine() {
    return this.driver?.engine;
  }

  get allColumns() {
    return this.getColumns(null).filter((col) => col.isChecked || col.uniquePath.length == 1);
  }

  reload() {
    this.setCache((cache) => ({
      // ...cache,
      ...createGridCache(),
      refreshTime: new Date().getTime(),
    }));
  }

  includeInColumnSet(field: keyof GridConfigColumns, uniqueName: string, isIncluded: boolean) {
    // console.log('includeInColumnSet', field, uniqueName, isIncluded);
    if (isIncluded) {
      this.setConfig({
        ...this.config,
        [field]: [...(this.config[field] || []), uniqueName],
      });
    } else {
      this.setConfig({
        ...this.config,
        [field]: (this.config[field] || []).filter((x) => x != uniqueName),
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
      hiddenColumns: this.columns.map((x) => x.uniqueName),
    });
  }

  get hiddenColumnIndexes() {
    return (this.config.hiddenColumns || []).map((x) => _.findIndex(this.columns, (y) => y.uniqueName == x));
  }

  isColumnChecked(column: DisplayColumn) {
    // console.log('isColumnChecked', column, this.config.hiddenColumns);
    return column.uniquePath.length == 1
      ? !this.config.hiddenColumns.includes(column.uniqueName)
      : this.config.addedColumns.includes(column.uniqueName);
  }

  applyFilterOnSelect(select: Select, displayedColumnInfo: DisplayedColumnInfo) {
    const conditions = [];
    for (const uniqueName in this.config.filters) {
      const filter = this.config.filters[uniqueName];
      if (!filter) continue;
      const column = displayedColumnInfo[uniqueName];
      if (!column) continue;
      try {
        const condition = parseFilter(filter, getFilterType(column.commonType?.typeCode));
        if (condition) {
          conditions.push(
            _.cloneDeepWith(condition, (expr: Expression) => {
              if (expr.exprType == 'placeholder')
                return {
                  exprType: 'column',
                  columnName: column.columnName,
                  source: { alias: column.sourceAlias },
                };
            })
          );
        }
      } catch (err) {
        console.warn(err.message);
        continue;
      }
    }

    if (conditions.length > 0) {
      select.where = {
        conditionType: 'and',
        conditions,
      };
    }
  }

  applySortOnSelect(select: Select, displayedColumnInfo: DisplayedColumnInfo) {
    if (this.config.sort?.length > 0) {
      select.orderBy = this.config.sort
        .map((col) => ({ ...col, dispInfo: displayedColumnInfo[col.uniqueName] }))
        .filter((col) => col.dispInfo)
        .map((col) => ({
          exprType: 'column',
          columnName: col.dispInfo.columnName,
          direction: col.order,
          source: { alias: col.dispInfo.sourceAlias },
        }));
    }
  }

  getColumns(columnFilter) {
    return this.columns.filter((col) => filterName(columnFilter, col.columnName));
  }

  getGridColumns() {
    return this.getColumns(null).filter((x) => this.isColumnChecked(x));
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

  setSort(uniqueName, order) {
    this.setConfig({
      ...this.config,
      sort: [{ uniqueName, order }],
    });
    this.reload();
  }

  getSortOrder(uniqueName) {
    return this.config.sort.find((x) => x.uniqueName == uniqueName)?.order;
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

  getChangeSetField(row, uniqueName, insertedRowIndex): ChangeSetFieldDefinition {
    const col = this.columns.find((x) => x.uniqueName == uniqueName);
    if (!col) return null;
    if (!this.baseTable) return null;
    if (this.baseTable.pureName != col.pureName || this.baseTable.schemaName != col.schemaName) return null;
    return {
      ...this.getChangeSetRow(row, insertedRowIndex),
      uniqueName: uniqueName,
      columnName: col.columnName,
    };
  }

  getChangeSetRow(row, insertedRowIndex): ChangeSetRowDefinition {
    if (!this.baseTable) return null;
    return {
      pureName: this.baseTable.pureName,
      schemaName: this.baseTable.schemaName,
      insertedRowIndex,
      condition: insertedRowIndex == null ? this.getChangeSetCondition(row) : null,
    };
  }

  createSelect(): Select {
    return null;
  }

  processReferences(select: Select, displayedColumnInfo: DisplayedColumnInfo): ReferenceActionResult {
    return 'noAction';
  }

  createSelectBase(name: NamedObjectInfo, columns: ColumnInfo[]) {
    if (!columns) return null;
    const orderColumnName = columns[0].columnName;
    const select: Select = {
      commandType: 'select',
      from: { name, alias: 'basetbl' },
      columns: columns.map((col) => ({
        exprType: 'column',
        alias: col.columnName,
        source: { alias: 'basetbl' },
        ...col,
      })),
      orderBy: [
        {
          exprType: 'column',
          columnName: orderColumnName,
          direction: 'ASC',
        },
      ],
    };
    const displayedColumnInfo = _.keyBy(
      this.columns.map((col) => ({ ...col, sourceAlias: 'basetbl' })),
      'uniqueName'
    );
    const action = this.processReferences(select, displayedColumnInfo);
    this.applyFilterOnSelect(select, displayedColumnInfo);
    this.applySortOnSelect(select, displayedColumnInfo);
    if (action == 'loadRequired') {
      return null;
    }
    return select;
  }

  getPageQuery(offset: number, count: number) {
    const select = this.createSelect();
    if (!select) return null;
    if (this.driver.dialect.rangeSelect) select.range = { offset: offset, limit: count };
    else if (this.driver.dialect.limitSelect) select.topRecords = count;
    const sql = treeToSql(this.driver, select, dumpSqlSelect);
    return sql;
  }

  getCountQuery() {
    const select = this.createSelect();
    select.columns = [
      {
        exprType: 'raw',
        sql: 'COUNT(*)',
        alias: 'count',
      },
    ];
    select.orderBy = null;
    const sql = treeToSql(this.driver, select, dumpSqlSelect);
    return sql;
  }
}
