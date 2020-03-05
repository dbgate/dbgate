import GridDisplay from './GridDisplay';
import { Select, treeToSql, dumpSqlSelect } from '@dbgate/sqltree';
import { TableInfo, EngineDriver } from '@dbgate/types';
import GridConfig from './GridConfig';

export default class TableGridDisplay extends GridDisplay {
  constructor(
    public table: TableInfo,
    public driver: EngineDriver,
    config: GridConfig,
    setConfig: (configh: GridConfig) => void
  ) {
    super(config, setConfig);
    this.columns = table.columns;
  }

  createSelect() {
    const orderColumnName = this.table.columns[0].columnName;
    const select: Select = {
      commandType: 'select',
      from: { name: this.table },
      columns: this.table.columns.map(col => ({ exprType: 'column', ...col })),
      orderBy: [
        {
          exprType: 'column',
          columnName: orderColumnName,
          direction: 'ASC',
        },
      ],
    };
    return select;
  }

  getPageQuery(offset: number, count: number) {
    const select = this.createSelect();
    if (this.driver.dialect.rangeSelect) select.range = { offset: offset, limit: count };
    else if (this.driver.dialect.limitSelect) select.topRecords = count;
    const sql = treeToSql(this.driver, select, dumpSqlSelect);
    return sql;
  }
}
