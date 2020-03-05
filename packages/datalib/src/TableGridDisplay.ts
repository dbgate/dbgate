import GridDisplay from "./GridDisplay";
import { Select } from "@dbgate/sqltree";
import { TableInfo, EngineDriver } from "@dbgate/types";

export default class TableGridDisplay extends GridDisplay {
  constructor(public table: TableInfo, public driver: EngineDriver) {
    super();
  }

  getPageQuery(offset: number, count: number) {
    const select = new Select();
    if (this.driver.dialect.limitSelect) select.topRecords = count;
    if (this.driver.dialect.rangeSelect)
      select.range = { offset: offset, limit: count };
    select.from = this.table;
    select.selectAll = true;
    const sql = select.toSql(this.driver);
    return sql;
  }
}
