import { TableInfo } from "./dbinfo";
import { SqlDialect } from "./dialect";

export interface SqlDumper {
  s: string;
  dialect: SqlDialect;

  putRaw(s: string);
  put(format: string, ...args);
  putCmd(format: string, ...args);
  putCollection<T>(
    delimiter: string,
    collection: T[],
    lambda: (item: T) => void
  );

  endCommand();
  createTable(table: TableInfo);
}
