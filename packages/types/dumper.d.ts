import { TableInfo } from './dbinfo';
import { SqlDialect } from './dialect';

export type TransformType = 'GROUP:YEAR' | 'GROUP:MONTH' | 'GROUP:DAY' | 'YEAR' | 'MONTH' | 'DAY'; // | 'GROUP:HOUR' | 'GROUP:MINUTE';

export interface SqlDumper {
  s: string;
  dialect: SqlDialect;

  putRaw(s: string);
  put(format: string, ...args);
  putCmd(format: string, ...args);
  putValue(value: string | number | Date);
  putCollection<T>(delimiter: string, collection: T[], lambda: (item: T) => void);
  transform(type: TransformType, dumpExpr: () => void);

  endCommand();
  createTable(table: TableInfo);
  allowIdentityInsert(table: NamedObjectInfo, allow: boolean);
}
