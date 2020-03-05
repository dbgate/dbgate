import { EngineDriver, SqlDumper } from '@dbgate/types';

export function treeToSql<T>(driver: EngineDriver, object: T, func: (dmp: SqlDumper, obj: T) => void) {
  const dmp = driver.createDumper();
  func(dmp, object);
  return dmp.s;
}
