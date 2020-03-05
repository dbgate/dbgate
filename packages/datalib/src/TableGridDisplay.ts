import GridDisplay from "./GridDisplay";
import { Select, treeToSql, dumpSqlSelect } from "@dbgate/sqltree";
import { TableInfo, EngineDriver } from "@dbgate/types";
import GridConfig from "./GridConfig";

export default class TableGridDisplay extends GridDisplay {
  constructor(
    public table: TableInfo,
    public driver: EngineDriver,
    config: GridConfig,
    setConfig: (configh: GridConfig) => void
  ) {
    super(config, setConfig);
  }

  createSelect() {
    const select: Select = {
      commandType: "select",
      from: this.table,
      selectAll: true
    };
    return select;
  }

  getPageQuery(offset: number, count: number) {
    const select = this.createSelect();
    if (this.driver.dialect.limitSelect) select.topRecords = count;
    if (this.driver.dialect.rangeSelect)
      select.range = { offset: offset, limit: count };
    const sql = treeToSql(this.driver, select, dumpSqlSelect);
    return sql;
  }
}
