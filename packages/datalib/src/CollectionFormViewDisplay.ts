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
import { filterName } from './filterName';
import { TableGridDisplay } from './TableGridDisplay';
import stableStringify from 'json-stable-stringify';
import { ChangeSetFieldDefinition, ChangeSetRowDefinition } from './ChangeSet';
import { CollectionGridDisplay } from './CollectionGridDisplay';

export class CollectionFormViewDisplay extends FormViewDisplay {
  // use utility functions from GridDisplay and publish result in FromViewDisplay interface
  private gridDisplay: CollectionGridDisplay;

  constructor(
    public collectionName: NamedObjectInfo,
    driver: EngineDriver,
    config: GridConfig,
    setConfig: ChangeConfigFunc,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    loadedRow: any
  ) {
    super(config, setConfig, cache, setCache, driver);
    this.gridDisplay = new CollectionGridDisplay(collectionName, driver, config, setConfig, cache, setCache, [loadedRow]);

    this.isLoadedCorrectly = this.gridDisplay.isLoadedCorrectly && !!this.driver;
    this.columns = [];
    this.addDisplayColumns(this.gridDisplay.columns);
  }

  addDisplayColumns(columns: DisplayColumn[]) {
    for (const col of columns) {
      this.columns.push(col);
    }
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

  toggleExpandedColumn(uniqueName: string) {
    this.gridDisplay.toggleExpandedColumn(uniqueName);
    this.gridDisplay.reload();
  }

  isExpandedColumn(uniqueName: string) {
    return this.gridDisplay.isExpandedColumn(uniqueName);
  }
}
