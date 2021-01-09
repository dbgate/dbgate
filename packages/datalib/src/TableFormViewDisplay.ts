import { FormViewDisplay } from './FormViewDisplay';
import _ from 'lodash';
import { GridDisplay, ChangeCacheFunc, DisplayColumn, DisplayedColumnInfo, ChangeConfigFunc } from './GridDisplay';
import { TableInfo, EngineDriver, ViewInfo, ColumnInfo, NamedObjectInfo, DatabaseInfo } from 'dbgate-types';
import { GridConfig, GridCache, createGridCache } from './GridConfig';
import { Expression, Select, treeToSql, dumpSqlSelect, mergeConditions, Condition } from 'dbgate-sqltree';
import { filterName } from './filterName';
import { TableGridDisplay } from './TableGridDisplay';

export class TableFormViewDisplay extends FormViewDisplay {
  public table: TableInfo;
  // use utility functions from GridDisplay and publish result in FromViewDisplat interface
  private gridDisplay: TableGridDisplay;

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
    this.gridDisplay = new TableGridDisplay(tableName, driver, config, setConfig, cache, setCache, dbinfo);

    this.isLoadedCorrectly = this.gridDisplay.isLoadedCorrectly;
    this.columns = this.gridDisplay.columns;
  }

  getPrimaryKeyCondition(): Condition {
    if (!this.config.formViewKey) return null;
    return {
      conditionType: 'and',
      conditions: _.keys(this.config.formViewKey).map((columnName) => ({
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
    };
  }

  getCurrentRowQuery() {
    if (!this.driver) return null;
    const select = this.gridDisplay.createSelect();
    if (!select) return null;
    select.topRecords = 1;
    select.where = mergeConditions(select.where, this.getPrimaryKeyCondition());
    const sql = treeToSql(this.driver, select, dumpSqlSelect);
    return sql;
  }
}
