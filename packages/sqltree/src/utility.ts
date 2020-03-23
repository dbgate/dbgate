import { EngineDriver, SqlDumper } from '@dbgate/types';
import { Command } from './types';
import { dumpSqlCommand } from './dumpSqlCommand';

export function treeToSql<T>(driver: EngineDriver, object: T, func: (dmp: SqlDumper, obj: T) => void) {
  const dmp = driver.createDumper();
  func(dmp, object);
  return dmp.s;
}

export function scriptToSql(driver: EngineDriver, script: Command[]): string {
  const dmp = driver.createDumper();
  for (const cmd of script) {
    dumpSqlCommand(dmp, cmd);
    dmp.endCommand();
  }
  return dmp.s;
}
