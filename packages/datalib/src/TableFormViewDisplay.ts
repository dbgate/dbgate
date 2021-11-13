import { FormViewDisplay } from './FormViewDisplay';
import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, DisplayColumn, DisplayedColumnInfo, ChangeConfigFunc } from './GridDisplay';
import { TableInfo, EngineDriver, ViewInfo, ColumnInfo, NamedObjectInfo, DatabaseInfo } from 'dbgate-types';
import { GridConfig, GridCache, createGridCache } from './GridConfig';
import {
  Expression,
  Select,
  treeToSql,
  dumpSqlSelect,
  mergeConditions,
  Condition,
  OrderByExpression,
} from 'dbgate-sqltree';
import { TableGridDisplay } from './TableGridDisplay';
import stableStringify from 'json-stable-stringify';
import { ChangeSetFieldDefinition, ChangeSetRowDefinition } from './ChangeSet';
import { DictionaryDescriptionFunc } from '.';

export class TableFormViewDisplay extends FormViewDisplay {
  // use utility functions from GridDisplay and publish result in FromViewDisplay interface
  private gridDisplay: TableGridDisplay;

  constructor(
    public tableName: NamedObjectInfo,
    driver: EngineDriver,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    dbinfo: DatabaseInfo,
    displayOptions,
    serverVersion,
    getDictionaryDescription: DictionaryDescriptionFunc = null
  ) {
    super(config, setConfig, cache, setCache, driver, dbinfo, serverVersion);
    this.gridDisplay = new TableGridDisplay(
      tableName,
      driver,
      config,
      setConfig,
      cache,
      setCache,
      dbinfo,
      displayOptions,
      serverVersion,
      getDictionaryDescription
    );
    this.gridDisplay.addAllExpandedColumnsToSelected = true;

    this.isLoadedCorrectly = this.gridDisplay.isLoadedCorrectly && !!this.driver;
    this.columns = [];
    this.addDisplayColumns(this.gridDisplay.columns);
    this.baseTable = this.gridDisplay.baseTable;
    this.gridDisplay.hintBaseColumns = this.columns;
  }

  addDisplayColumns(columns: DisplayColumn[]) {
    for (const col of columns) {
      this.columns.push(col);
      if (this.gridDisplay.isExpandedColumn(col.uniqueName)) {
        const table = this.gridDisplay.getFkTarget(col);
        if (table) {
          const subcolumns = this.gridDisplay.getDisplayColumns(table, col.uniquePath);
          this.addDisplayColumns(subcolumns);
        }
      }
    }
  }

  getPrimaryKeyEqualCondition(row = null): Condition {
    if (!row) row = this.config.formViewKeyRequested || this.config.formViewKey;
    if (!row) return null;
    const { primaryKey } = this.gridDisplay.baseTable;
    if (!primaryKey) return null;
    return {
      conditionType: 'and',
      conditions: primaryKey.columns.map(({ columnName }) => ({
        conditionType: 'binary',
        operator: '=',
        left: {
          exprType: 'column',
          columnName,
          source: {
            alias: 'basetbl',
          },
        },
        right: {
          exprType: 'value',
          value: row[columnName],
        },
      })),
    };
  }

  getPrimaryKeyOperatorCondition(operator): Condition {
    if (!this.config.formViewKey) return null;
    const conditions = [];

    const { primaryKey } = this.gridDisplay.baseTable;
    if (!primaryKey) return null;
    for (let index = 0; index < primaryKey.columns.length; index++) {
      conditions.push({
        conditionType: 'and',
        conditions: [
          ...primaryKey.columns.slice(0, index).map(({ columnName }) => ({
            conditionType: 'binary',
            operator: '=',
            left: {
              exprType: 'column',
              columnName,
              source: {
                alias: 'basetbl',
              },
            },
            right: {
              exprType: 'value',
              value: this.config.formViewKey[columnName],
            },
          })),
          ...primaryKey.columns.slice(index).map(({ columnName }) => ({
            conditionType: 'binary',
            operator: operator,
            left: {
              exprType: 'column',
              columnName,
              source: {
                alias: 'basetbl',
              },
            },
            right: {
              exprType: 'value',
              value: this.config.formViewKey[columnName],
            },
          })),
        ],
      });
    }

    if (conditions.length == 1) {
      return conditions[0];
    }

    return {
      conditionType: 'or',
      conditions,
    };
  }

  getSelect() {
    if (!this.driver) return null;
    const select = this.gridDisplay.createSelect();
    if (!select) return null;
    select.topRecords = 1;
    return select;
  }

  getCurrentRowQuery() {
    const select = this.getSelect();
    if (!select) return null;

    select.where = mergeConditions(select.where, this.getPrimaryKeyEqualCondition());
    const sql = treeToSql(this.driver, select, dumpSqlSelect);
    return sql;
  }

  getCountSelect() {
    const select = this.getSelect();
    if (!select) return null;
    select.orderBy = null;
    select.columns = [
      {
        exprType: 'raw',
        sql: 'COUNT(*)',
        alias: 'count',
      },
    ];
    select.topRecords = null;
    return select;
  }

  getCountQuery() {
    if (!this.driver) return null;
    const select = this.getCountSelect();
    if (!select) return null;
    const sql = treeToSql(this.driver, select, dumpSqlSelect);
    return sql;
  }

  getBeforeCountQuery() {
    if (!this.driver) return null;
    const select = this.getCountSelect();
    if (!select) return null;
    select.where = mergeConditions(select.where, this.getPrimaryKeyOperatorCondition('<'));
    const sql = treeToSql(this.driver, select, dumpSqlSelect);
    return sql;
  }

  navigate(row) {
    const formViewKey = this.extractKey(row);
    this.setConfig(cfg => ({
      ...cfg,
      formViewKey,
    }));
  }

  isLoadedCurrentRow(row) {
    if (!row) return false;
    const formViewKey = this.extractKey(row);
    return stableStringify(formViewKey) == stableStringify(this.config.formViewKey);
  }

  navigateRowQuery(commmand: 'begin' | 'previous' | 'next' | 'end') {
    if (!this.driver) return null;
    const select = this.gridDisplay.createSelect();
    if (!select) return null;
    const { primaryKey } = this.gridDisplay.baseTable;

    function getOrderBy(direction): OrderByExpression[] {
      return primaryKey.columns.map(({ columnName }) => ({
        exprType: 'column',
        columnName,
        direction,
      }));
    }

    select.topRecords = 1;
    switch (commmand) {
      case 'begin':
        select.orderBy = getOrderBy('ASC');
        break;
      case 'end':
        select.orderBy = getOrderBy('DESC');
        break;
      case 'previous':
        select.orderBy = getOrderBy('DESC');
        select.where = mergeConditions(select.where, this.getPrimaryKeyOperatorCondition('<'));
        break;
      case 'next':
        select.orderBy = getOrderBy('ASC');
        select.where = mergeConditions(select.where, this.getPrimaryKeyOperatorCondition('>'));
        break;
    }

    const sql = treeToSql(this.driver, select, dumpSqlSelect);
    return sql;
  }

  getChangeSetRow(row): ChangeSetRowDefinition {
    if (!this.baseTable) return null;
    return {
      pureName: this.baseTable.pureName,
      schemaName: this.baseTable.schemaName,
      condition: this.extractKey(row),
    };
  }

  getChangeSetField(row, uniqueName): ChangeSetFieldDefinition {
    const col = this.columns.find(x => x.uniqueName == uniqueName);
    if (!col) return null;
    if (!this.baseTable) return null;
    if (this.baseTable.pureName != col.pureName || this.baseTable.schemaName != col.schemaName) return null;
    return {
      ...this.getChangeSetRow(row),
      uniqueName: uniqueName,
      columnName: col.columnName,
    };
  }

  toggleExpandedColumn(uniqueName: string, value?: boolean) {
    this.gridDisplay.toggleExpandedColumn(uniqueName, value);
    this.gridDisplay.reload();
  }

  isExpandedColumn(uniqueName: string) {
    return this.gridDisplay.isExpandedColumn(uniqueName);
  }
}
