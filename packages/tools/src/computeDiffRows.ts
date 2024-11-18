import {
  DbDiffOptions,
  testEqualColumns,
  testEqualTables,
  testEqualSqlObjects,
  createAlterDatabasePlan,
} from './diffTools';
import type { DatabaseInfo, EngineDriver, NamedObjectInfo, SqlObjectInfo, TableInfo } from 'dbgate-types';
import _ from 'lodash';
import { extendDatabaseInfo } from './structureTools';
import { AlterOperation, runAlterOperation } from './alterPlan';

export function computeDiffRowsCore(sourceList, targetList, testEqual) {
  const res = [];
  for (const obj of sourceList) {
    const paired = targetList.find(x => x.pairingId == obj.pairingId);
    if (paired) {
      const isEqual = testEqual(obj, paired);
      res.push({
        source: obj,
        target: paired,
        state: isEqual ? 'equal' : 'changed',
        __isChanged: !isEqual,
      });
    } else {
      res.push({
        source: obj,
        state: 'added',
        __isAdded: true,
      });
    }
  }
  for (const obj of targetList) {
    const paired = sourceList.find(x => x.pairingId == obj.pairingId);
    if (!paired) {
      res.push({
        target: obj,
        state: 'removed',
        __isDeleted: true,
      });
    }
  }

  return res;
}

export const DbDiffCompareDefs = {
  tables: {
    test: testEqualTables,
    name: 'Table',
    plural: 'Tables',
    icon: 'img table',
  },
  views: {
    test: testEqualSqlObjects,
    name: 'View',
    plural: 'Views',
    icon: 'img view',
  },
  matviews: {
    test: testEqualSqlObjects,
    name: 'Materialized view',
    plural: 'Materialized views',
    icon: 'img view',
  },
  procedures: {
    test: testEqualSqlObjects,
    name: 'Procedure',
    plural: 'Procedures',
    icon: 'img procedure',
  },
  functions: {
    test: testEqualSqlObjects,
    name: 'Function',
    plural: 'Functions',
    icon: 'img function',
  },
};

export function computeDbDiffRows(
  sourceDb: DatabaseInfo,
  targetDb: DatabaseInfo,
  opts: DbDiffOptions,
  driver: EngineDriver
) {
  if (!sourceDb || !targetDb || !driver) return [];

  const res = [];
  for (const objectTypeField of ['tables', 'views', 'procedures', 'matviews', 'functions']) {
    const defs = DbDiffCompareDefs[objectTypeField];
    res.push(
      ..._.sortBy(
        computeDiffRowsCore(sourceDb[objectTypeField], targetDb[objectTypeField], (a, b) =>
          defs.test(a, b, opts, sourceDb, targetDb, driver)
        ).map(row => ({
          ...row,
          sourceSchemaName: row?.source?.schemaName,
          sourcePureName: row?.source?.pureName,
          targetSchemaName: row?.target?.schemaName,
          targetPureName: row?.target?.pureName,
          typeName: defs.name,
          typeIcon: defs.icon,
          identifier: `${row?.source?.schemaName || row?.target?.schemaName}.${
            row?.source?.pureName || row?.target?.pureName
          }`,
          objectTypeField,
        })),
        'identifier'
      )
    );
  }
  return res;
}

export function computeTableDiffColumns(
  sourceTable: TableInfo,
  targetTable: TableInfo,
  opts: DbDiffOptions,
  driver: EngineDriver
) {
  if (!driver) return [];
  return computeDiffRowsCore(sourceTable?.columns || [], targetTable?.columns || [], (a, b) =>
    testEqualColumns(a, b, true, true, opts)
  ).map(row => ({
    ...row,
    sourceColumnName: row?.source?.columnName,
    targetColumnName: row?.target?.columnName,
    sourceDataType: row?.source?.dataType,
    targetDataType: row?.target?.dataType,
    sourceAutoIncrement: row?.source?.autoIncrement,
    targetAutoIncrement: row?.target?.autoIncrement,
    sourceNotNull: row?.source?.notNull,
    targetNotNull: row?.target?.notNull,
  }));
}

export interface DiffOperationItemDisplay {
  operationType: string;
  name: string;
  sqlScript: string;
  identifier?: string;
}

export function getOperationDisplay(operation: AlterOperation, driver: EngineDriver): DiffOperationItemDisplay {
  const op = operation as any;
  const name =
    op?.newName ??
    op?.newObject?.columnName ??
    op?.newObject?.constraintName ??
    op?.newObject?.pureName ??
    op?.oldObject?.columnName ??
    op?.oldObject?.constraintName ??
    op?.oldObject?.pureName ??
    op?.table?.pureName ??
    op?.object?.columnName ??
    op?.object?.constraintName ??
    op?.object?.pureName;

  const dmp = driver.createDumper();
  runAlterOperation(operation, dmp);

  return {
    operationType: operation.operationType,
    name,
    sqlScript: dmp.s,
    identifier: dmp.s,
  };
}

export function computeObjectDiffOperations(
  sourceObject: { objectTypeField: string },
  targetObject: { objectTypeField: string },
  sourceDb: DatabaseInfo,
  targetDb: DatabaseInfo,
  opts: DbDiffOptions,
  driver: EngineDriver
): DiffOperationItemDisplay[] {
  if (!driver) return [];
  const srcdb = sourceObject
    ? extendDatabaseInfo({ [sourceObject.objectTypeField]: [sourceObject] } as unknown as DatabaseInfo)
    : extendDatabaseInfo({} as unknown as DatabaseInfo);
  const dstdb = targetObject
    ? extendDatabaseInfo({ [targetObject.objectTypeField]: [targetObject] } as unknown as DatabaseInfo)
    : extendDatabaseInfo({} as unknown as DatabaseInfo);
  const plan = createAlterDatabasePlan(dstdb, srcdb, opts, targetDb, sourceDb, driver);
  return plan.operations.map(item => getOperationDisplay(item, driver));
}

export function getCreateObjectScript(obj: TableInfo | SqlObjectInfo, driver: EngineDriver) {
  if (!obj || !driver) return '';
  if (obj.objectTypeField == 'tables') {
    const dmp = driver.createDumper();
    dmp.createTable(obj as TableInfo);
    return dmp.s;
  }
  return (obj as SqlObjectInfo).createSql || '';
}
