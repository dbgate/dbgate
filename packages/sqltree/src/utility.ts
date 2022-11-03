import type { EngineDriver, SqlDumper } from 'dbgate-types';
import { Command, Condition } from './types';
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

export function mergeConditions(condition1: Condition, condition2: Condition): Condition {
  if (!condition1) return condition2;
  if (!condition2) return condition1;
  if (condition1.conditionType == 'and' && condition2.conditionType == 'and') {
    return {
      conditionType: 'and',
      conditions: [...condition1.conditions, ...condition2.conditions],
    };
  }
  if (condition1.conditionType == 'and') {
    return {
      conditionType: 'and',
      conditions: [...condition1.conditions, condition2],
    };
  }
  if (condition2.conditionType == 'and') {
    return {
      conditionType: 'and',
      conditions: [condition1, ...condition2.conditions],
    };
  }
  return {
    conditionType: 'and',
    conditions: [condition1, condition2],
  };
}
