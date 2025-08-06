import type { EngineDriver, SqlDumper } from 'dbgate-types';
import { Command, Condition, Select, Source } from './types';
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

export function selectKeysFromTable(options: {
  pureName: string;
  schemaName: string;
  keyColumns: [];
  loadKeys: any[][];
}): Select {
  const source: Source = {
    name: { pureName: options.pureName, schemaName: options.schemaName },
  };
  const res: Select = {
    commandType: 'select',
    columns: options.keyColumns.map(col => ({
      exprType: 'column',
      columnName: col,
      source,
    })),
    from: source,
    where: {
      conditionType: 'or',
      conditions: options.loadKeys.map(key => ({
        conditionType: 'and',
        conditions: key.map((keyValue, index) => ({
          conditionType: 'binary',
          operator: '=',
          left: {
            exprType: 'column',
            columnName: options.keyColumns[index],
            source,
          },
          right: {
            exprType: 'value',
            value: keyValue,
          },
        })),
      })),
    },
  };
  return res;
}

export function createLogCompoudCondition(
  fieldFilters: { [field: string]: string[] },
  timeColumn: string,
  timeFrom: number,
  timeTo: number
): Condition {
  const conditions: Condition[] = [
    {
      conditionType: 'binary',
      operator: '>=',
      left: { exprType: 'column', columnName: timeColumn },
      right: { exprType: 'value', value: timeFrom },
    },
    {
      conditionType: 'binary',
      operator: '<=',
      left: { exprType: 'column', columnName: timeColumn },
      right: { exprType: 'value', value: timeTo },
    },
  ];
  for (const [key, values] of Object.entries(fieldFilters)) {
    if (values.length == 1 && values[0] == null) {
      conditions.push({
        conditionType: 'isNull',
        expr: { exprType: 'column', columnName: key },
      });
      continue;
    }
    conditions.push({
      conditionType: 'in',
      expr: { exprType: 'column', columnName: key },
      values,
    });
  }

  return {
    conditionType: 'and',
    conditions,
  };
}
