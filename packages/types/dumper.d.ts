import { TableInfo } from "./dbinfo";

export interface SqlDumper {
  s: string;

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
