import { TableInfo } from "./dbinfo";

export interface SqlDumper {
  s: string;
  put(format: string, ...args);
  putCmd(format: string, ...args);
  endCommand();
  createTable(table: TableInfo);
}
