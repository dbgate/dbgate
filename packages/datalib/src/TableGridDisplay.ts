import _ from 'lodash';
import { GridDisplay, combineReferenceActions, ChangeCacheFunc } from './GridDisplay';
import { Select, treeToSql, dumpSqlSelect } from '@dbgate/sqltree';
import { TableInfo, EngineDriver } from '@dbgate/types';
import { GridConfig, GridCache } from './GridConfig';

export class TableGridDisplay extends GridDisplay {
  constructor(
    public table: TableInfo,
    driver: EngineDriver,
    config: GridConfig,
    setConfig: (config: GridConfig) => void,
    cache: GridCache,
    setCache: ChangeCacheFunc,
    getTableInfo: ({ schemaName, pureName }) => Promise<TableInfo>
  ) {
    super(config, setConfig, cache, setCache, getTableInfo, driver);
    this.columns = this.getDisplayColumns(table, []);
    this.baseTable = table;
    if (table && table.columns) {
      this.changeSetKeyFields = table.primaryKey
        ? table.primaryKey.columns.map(x => x.columnName)
        : table.columns.map(x => x.columnName);
    }
  }

  createSelect() {
    if (!this.table.columns) return null;
    const orderColumnName = this.table.columns[0].columnName;
    const select: Select = {
      commandType: 'select',
      from: { name: this.table, alias: 'basetbl' },
      columns: this.table.columns.map(col => ({
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
    const action = combineReferenceActions(
      this.addJoinsFromExpandedColumns(select, this.columns, 'basetbl', displayedColumnInfo),
      this.addHintsToSelect(select)
    );
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
}
