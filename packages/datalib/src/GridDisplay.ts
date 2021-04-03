import _ from 'lodash';
import { GridConfig, GridCache, GridConfigColumns, createGridCache, GroupFunc } from './GridConfig';
import { ForeignKeyInfo, TableInfo, ColumnInfo, EngineDriver, NamedObjectInfo, DatabaseInfo } from 'dbgate-types';
import { parseFilter, getFilterType } from 'dbgate-filterparser';
import { filterName } from './filterName';
import { ChangeSetFieldDefinition, ChangeSetRowDefinition } from './ChangeSet';
import { Expression, Select, treeToSql, dumpSqlSelect, Condition } from 'dbgate-sqltree';
import { isTypeLogical } from 'dbgate-tools';

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
  isExpandable?: boolean;
  isChecked?: boolean;
  hintColumnName?: string;
  dataType?: string;
  isStructured?: boolean;
}

export interface DisplayedColumnEx extends DisplayColumn {
  sourceAlias: string;
}

export interface DisplayedColumnInfo {
  [uniqueName: string]: DisplayedColumnEx;
}

// export type ReferenceActionResult = 'noAction' | 'loadRequired' | 'refAdded';

// export function combineReferenceActions(a: ReferenceActionResult, b: ReferenceActionResult): ReferenceActionResult {
//   if (a == 'loadRequired' || b == 'loadRequired') return 'loadRequired';
//   if (a == 'refAdded' || b == 'refAdded') return 'refAdded';
//   return 'noAction';
// }

export type ChangeCacheFunc = (changeFunc: (cache: GridCache) => GridCache) => void;
export type ChangeConfigFunc = (changeFunc: (config: GridConfig) => GridConfig) => void;

export abstract class GridDisplay {
  constructor(
    public config: GridConfig,
    protected setConfig: ChangeConfigFunc,
    public cache: GridCache,
    protected setCache: ChangeCacheFunc,
    public driver?: EngineDriver,
    public dbinfo: DatabaseInfo = null
  ) {}
  columns: DisplayColumn[];
  baseTable?: TableInfo;
  changeSetKeyFields: string[] = null;
  sortable = false;
  filterable = false;
  editable = false;
  isLoadedCorrectly = true;
  supportsReload = false;
  isDynamicStructure = false;

  setColumnVisibility(uniquePath: string[], isVisible: boolean) {
    const uniqueName = uniquePath.join('.');
    if (uniquePath.length == 1) {
      this.includeInColumnSet('hiddenColumns', uniqueName, !isVisible);
    } else {
      this.includeInColumnSet('addedColumns', uniqueName, isVisible);
      if (!this.isDynamicStructure) this.reload();
    }
  }

  focusColumn(uniqueName: string) {
    this.setConfig(cfg => ({
      ...cfg,
      focusedColumn: uniqueName,
    }));
  }

  get hasReferences() {
    return false;
  }

  get focusedColumn() {
    return this.config.focusedColumn;
  }

  get engine() {
    return this.driver?.engine;
  }

  get allColumns() {
    return this.getColumns(null).filter(col => col.isChecked || col.uniquePath.length == 1);
  }

  reload() {
    this.setCache(cache => ({
      // ...cache,
      ...createGridCache(),
      refreshTime: new Date().getTime(),
    }));
  }

  includeInColumnSet(field: keyof GridConfigColumns, uniqueName: string, isIncluded: boolean) {
    // console.log('includeInColumnSet', field, uniqueName, isIncluded);
    if (isIncluded) {
      this.setConfig(cfg => ({
        ...cfg,
        [field]: [...(cfg[field] || []), uniqueName],
      }));
    } else {
      this.setConfig(cfg => ({
        ...cfg,
        [field]: (cfg[field] || []).filter(x => x != uniqueName),
      }));
    }
  }

  showAllColumns() {
    this.setConfig(cfg => ({
      ...cfg,
      hiddenColumns: [],
    }));
  }

  hideAllColumns() {
    this.setConfig(cfg => ({
      ...cfg,
      hiddenColumns: this.columns.map(x => x.uniqueName),
    }));
  }

  get hiddenColumnIndexes() {
    return (this.config.hiddenColumns || []).map(x => _.findIndex(this.columns, y => y.uniqueName == x));
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
        const condition = parseFilter(filter, getFilterType(column.dataType));
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
        .map(col => ({ ...col, dispInfo: displayedColumnInfo[col.uniqueName] }))
        .map(col => ({ ...col, expr: select.columns.find(x => x.alias == col.uniqueName) }))
        .filter(col => col.dispInfo && col.expr)
        .map(col => ({
          ...col.expr,
          direction: col.order,
        }));
    }
  }

  get isGrouped() {
    return !_.isEmpty(this.config.grouping);
  }

  get groupColumns() {
    return this.isGrouped ? _.keys(_.pickBy(this.config.grouping, v => v == 'GROUP' || v.startsWith('GROUP:'))) : null;
  }

  applyGroupOnSelect(select: Select, displayedColumnInfo: DisplayedColumnInfo) {
    const groupColumns = this.groupColumns;
    if (groupColumns && groupColumns.length > 0) {
      // @ts-ignore
      select.groupBy = groupColumns.map(col => {
        const colExpr: Expression = {
          exprType: 'column',
          columnName: displayedColumnInfo[col].columnName,
          source: { alias: displayedColumnInfo[col].sourceAlias },
        };
        const grouping = this.config.grouping[col];
        if (grouping.startsWith('GROUP:')) {
          return {
            exprType: 'transform',
            transform: grouping,
            expr: colExpr,
          };
        } else {
          return colExpr;
        }
      });
    }
    if (!_.isEmpty(this.config.grouping)) {
      for (let i = 0; i < select.columns.length; i++) {
        const uniqueName = select.columns[i].alias;
        // if (groupColumns && groupColumns.includes(uniqueName)) continue;
        const grouping = this.getGrouping(uniqueName);
        if (grouping == 'GROUP') {
          continue;
        } else if (grouping == 'NULL') {
          select.columns[i].alias = null;
        } else if (grouping && grouping.startsWith('GROUP:')) {
          select.columns[i] = {
            exprType: 'transform',
            transform: grouping as any,
            expr: select.columns[i],
            alias: select.columns[i].alias,
          };
        } else {
          let func = 'MAX';
          let argsPrefix = '';
          if (grouping) {
            if (grouping == 'COUNT DISTINCT') {
              func = 'COUNT';
              argsPrefix = 'DISTINCT ';
            } else {
              func = grouping;
            }
          }
          select.columns[i] = {
            alias: select.columns[i].alias,
            exprType: 'call',
            func,
            argsPrefix,
            args: [select.columns[i]],
          };
        }
      }
      select.columns = select.columns.filter(x => x.alias);
    }
  }

  getColumns(columnFilter) {
    return this.columns.filter(col => filterName(columnFilter, col.columnName));
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
    this.setConfig(cfg => ({
      ...cfg,
      filters: {
        ...cfg.filters,
        [uniqueName]: value,
      },
    }));
    this.reload();
  }

  setFilters(dct) {
    this.setConfig(cfg => ({
      ...cfg,
      filters: {
        ...cfg.filters,
        ...dct,
      },
    }));
    this.reload();
  }

  setSort(uniqueName, order) {
    this.setConfig(cfg => ({
      ...cfg,
      sort: [{ uniqueName, order }],
    }));
    this.reload();
  }

  setGrouping(uniqueName, groupFunc: GroupFunc) {
    this.setConfig(cfg => ({
      ...cfg,
      grouping: groupFunc
        ? {
            ...cfg.grouping,
            [uniqueName]: groupFunc,
          }
        : _.omitBy(cfg.grouping, (v, k) => k == uniqueName),
    }));
    this.reload();
  }

  getGrouping(uniqueName): GroupFunc {
    if (this.isGrouped) {
      if (this.config.grouping[uniqueName]) return this.config.grouping[uniqueName];
      const column = this.baseTable.columns.find(x => x.columnName == uniqueName);
      if (isTypeLogical(column?.dataType)) return 'COUNT DISTINCT';
      if (column?.autoIncrement) return 'COUNT';
      return 'MAX';
    }
    return null;
  }

  clearGrouping() {
    this.setConfig(cfg => ({
      ...cfg,
      grouping: {},
    }));
    this.reload();
  }

  getSortOrder(uniqueName) {
    return this.config.sort.find(x => x.uniqueName == uniqueName)?.order;
  }

  get filterCount() {
    return _.compact(_.values(this.config.filters)).length;
  }

  clearFilters() {
    this.setConfig(cfg => ({
      ...cfg,
      filters: {},
    }));
    this.reload();
  }

  getChangeSetCondition(row) {
    if (!this.changeSetKeyFields) return null;
    return _.pick(row, this.changeSetKeyFields);
  }

  getChangeSetField(row, uniqueName, insertedRowIndex): ChangeSetFieldDefinition {
    const col = this.columns.find(x => x.uniqueName == uniqueName);
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

  createSelect(options = {}): Select {
    return null;
  }

  processReferences(select: Select, displayedColumnInfo: DisplayedColumnInfo, options) {}

  createSelectBase(name: NamedObjectInfo, columns: ColumnInfo[], options) {
    if (!columns) return null;
    const orderColumnName = columns[0].columnName;
    const select: Select = {
      commandType: 'select',
      from: { name, alias: 'basetbl' },
      columns: columns.map(col => ({
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
      this.columns.map(col => ({ ...col, sourceAlias: 'basetbl' })),
      'uniqueName'
    );
    this.processReferences(select, displayedColumnInfo, options);
    this.applyFilterOnSelect(select, displayedColumnInfo);
    this.applyGroupOnSelect(select, displayedColumnInfo);
    this.applySortOnSelect(select, displayedColumnInfo);
    return select;
  }

  getPageQuery(offset: number, count: number) {
    if (!this.driver) return null;
    const select = this.createSelect();
    if (!select) return null;
    if (this.driver.dialect.rangeSelect) select.range = { offset: offset, limit: count };
    else if (this.driver.dialect.limitSelect) select.topRecords = count;
    const sql = treeToSql(this.driver, select, dumpSqlSelect);
    return sql;
  }

  getExportQuery(postprocessSelect = null) {
    const select = this.createSelect({ isExport: true });
    if (!select) return null;
    if (postprocessSelect) postprocessSelect(select);
    const sql = treeToSql(this.driver, select, dumpSqlSelect);
    return sql;
  }

  resizeColumn(uniqueName: string, computedSize: number, diff: number) {
    this.setConfig(cfg => {
      const columnWidths = {
        ...cfg.columnWidths,
      };
      if (columnWidths[uniqueName]) {
        columnWidths[uniqueName] += diff;
      } else {
        columnWidths[uniqueName] = computedSize + diff;
      }
      return {
        ...cfg,
        columnWidths,
      };
    });
  }

  getCountQuery() {
    let select = this.createSelect();
    select.orderBy = null;

    if (this.isGrouped) {
      select = {
        commandType: 'select',
        from: {
          subQuery: select,
          alias: 'subq',
        },
        columns: [
          {
            exprType: 'raw',
            sql: 'COUNT(*)',
            alias: 'count',
          },
        ],
      };
    } else {
      select.columns = [
        {
          exprType: 'raw',
          sql: 'COUNT(*)',
          alias: 'count',
        },
      ];
    }
    const sql = treeToSql(this.driver, select, dumpSqlSelect);
    return sql;
  }

  compileFilters(): Condition {
    const filters = this.config && this.config.filters;
    if (!filters) return null;
    const conditions = [];
    for (const name in filters) {
      const column = this.columns.find(x => (x.columnName = name));
      if (!column) continue;
      const filterType = getFilterType(column.dataType);
      try {
        const condition = parseFilter(filters[name], filterType);
        const replaced = _.cloneDeepWith(condition, (expr: Expression) => {
          if (expr.exprType == 'placeholder')
            return {
              exprType: 'column',
              columnName: column.columnName,
            };
        });
        conditions.push(replaced);
      } catch (err) {
        // filter parse error - ignore filter
      }
    }
    if (conditions.length == 0) return null;
    return {
      conditionType: 'and',
      conditions,
    };
  }

  switchToFormView(rowData) {
    if (!this.baseTable) return;
    const { primaryKey } = this.baseTable;
    if (!primaryKey) return;
    const { columns } = primaryKey;

    this.setConfig(cfg => ({
      ...cfg,
      isFormView: true,
      formViewKey: rowData
        ? _.pick(
            rowData,
            columns.map(x => x.columnName)
          )
        : null,
      formViewKeyRequested: null,
    }));
  }
}
