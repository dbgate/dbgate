import { AlterProcessor } from './alter-processor';
import { CallableObjectInfo, NamedObjectInfo, TableInfo } from './dbinfo';
import { SqlDialect } from './dialect';

export type TransformType = 'GROUP:YEAR' | 'GROUP:MONTH' | 'GROUP:DAY' | 'YEAR' | 'MONTH' | 'DAY'; // | 'GROUP:HOUR' | 'GROUP:MINUTE';

export interface SqlDumper extends AlterProcessor {
  s: string;
  dialect: SqlDialect;

  putRaw(s: string);
  put(format: string, ...args);
  putCmd(format: string, ...args);
  putValue(value: string | number | Date, dataType?: string);
  putCollection<T>(delimiter: string, collection: T[], lambda: (item: T) => void);
  transform(type: TransformType, dumpExpr: () => void);
  createDatabase(name: string);
  dropDatabase(name: string);

  callableTemplate(func: CallableObjectInfo);

  endCommand();
  allowIdentityInsert(table: NamedObjectInfo, allow: boolean);
  truncateTable(table: NamedObjectInfo);
  beginTransaction();
  commitTransaction();
  rollbackTransaction();
}
