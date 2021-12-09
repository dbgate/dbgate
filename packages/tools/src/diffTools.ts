import {
  ColumnInfo,
  ConstraintInfo,
  DatabaseInfo,
  EngineDriver,
  NamedObjectInfo,
  SqlDialect,
  SqlObjectInfo,
  TableInfo,
} from 'dbgate-types';
import uuidv1 from 'uuid/v1';
import { AlterPlan } from './alterPlan';
import stableStringify from 'json-stable-stringify';
import _omit from 'lodash/omit';
import _cloneDeep from 'lodash/cloneDeep';
import _isEqual from 'lodash/isEqual';
import _pick from 'lodash/pick';

type DbDiffSchemaMode = 'strict' | 'ignore' | 'ignoreImplicit';

export interface DbDiffOptions {
  // allowRecreateTable?: boolean;
  // allowRecreateConstraint?: boolean;
  // allowRecreateSpecificObject?: boolean;
  // allowPairRenamedTables?: boolean;

  ignoreCase?: boolean;
  schemaMode?: DbDiffSchemaMode;
  leftImplicitSchema?: string;
  rightImplicitSchema?: string;
  ignoreConstraintNames?: boolean;

  noDropTable?: boolean;
  noDropColumn?: boolean;
  noDropConstraint?: boolean;
  noDropSqlObject?: boolean;
  noRenameTable?: boolean;
  noRenameColumn?: boolean;

  ignoreForeignKeyActions?: boolean;
  ignoreDataTypes?: boolean;
}

export function generateTablePairingId(table: TableInfo): TableInfo {
  if (!table) return table;
  if (!table.pairingId) {
    return {
      ...table,
      columns: table.columns?.map(col => ({
        ...col,
        pairingId: col.pairingId || uuidv1(),
      })),
      foreignKeys: table.foreignKeys?.map(cnt => ({
        ...cnt,
        pairingId: cnt.pairingId || uuidv1(),
      })),
      checks: table.checks?.map(cnt => ({
        ...cnt,
        pairingId: cnt.pairingId || uuidv1(),
      })),
      indexes: table.indexes?.map(cnt => ({
        ...cnt,
        pairingId: cnt.pairingId || uuidv1(),
      })),
      uniques: table.uniques?.map(cnt => ({
        ...cnt,
        pairingId: cnt.pairingId || uuidv1(),
      })),
      pairingId: table.pairingId || uuidv1(),
    };
  }
  return table;
}

function generateObjectPairingId(obj) {
  if (obj.objectTypeField)
    return {
      ...obj,
      pairingId: obj.pairingId || uuidv1(),
    };
  return obj;
}

export function generateDbPairingId(db: DatabaseInfo): DatabaseInfo {
  if (!db) return db;

  return {
    ...db,
    // ..._.mapValues(db, v => (_.isArray(v) ? v.map(generateObjectPairingId) : v)),
    tables: db.tables?.map(generateTablePairingId),
    views: db.views?.map(generateObjectPairingId),
    procedures: db.procedures?.map(generateObjectPairingId),
    functions: db.functions?.map(generateObjectPairingId),
    triggers: db.triggers?.map(generateObjectPairingId),
    matviews: db.matviews?.map(generateObjectPairingId),
  };
}

function testEqualNames(a: string, b: string, opts: DbDiffOptions) {
  if (opts.ignoreCase) return (a || '').toLowerCase() == (b || '').toLowerCase();
  return a == b;
}

function testEqualSchemas(lschema: string, rschema: string, opts: DbDiffOptions) {
  if (opts.schemaMode == 'ignore') lschema = null;
  if (opts.schemaMode == 'ignoreImplicit' && lschema == opts.leftImplicitSchema) lschema = null;
  if (opts.schemaMode == 'ignore') rschema = null;
  if (opts.schemaMode == 'ignoreImplicit' && rschema == opts.rightImplicitSchema) rschema = null;
  return testEqualNames(lschema, rschema, opts);
}

function testEqualFullNames(lft: NamedObjectInfo, rgt: NamedObjectInfo, opts: DbDiffOptions) {
  if (lft == null || rgt == null) return lft == rgt;
  return testEqualSchemas(lft.schemaName, rgt.schemaName, opts) && testEqualNames(lft.pureName, rgt.pureName, opts);
}

export function testEqualColumns(
  a: ColumnInfo,
  b: ColumnInfo,
  checkName: boolean,
  checkDefault: boolean,
  opts: DbDiffOptions = {}
) {
  if (checkName && !testEqualNames(a.columnName, b.columnName, opts)) {
    // opts.DiffLogger.Trace("Column, different name: {0}; {1}", a, b);
    return false;
  }
  //if (!DbDiffTool.EqualFullNames(a.Domain, b.Domain, opts))
  //{
  //    opts.DiffLogger.Trace("Column {0}, {1}: different domain: {2}; {3}", a, b, a.Domain, b.Domain);
  //    return false;
  //}
  if (a.computedExpression != b.computedExpression) {
    console.debug(
      `Column ${a.pureName}.${a.columnName}, ${b.pureName}.${b.columnName}: different computed expression: ${a.computedExpression}, ${b.computedExpression}`
    );
    // opts.DiffLogger.Trace(
    //   'Column {0}, {1}: different computed expression: {2}; {3}',
    //   a,
    //   b,
    //   a.ComputedExpression,
    //   b.ComputedExpression
    // );
    return false;
  }
  if (a.computedExpression != null) {
    return true;
  }
  if (checkDefault) {
    if (a.defaultValue == null) {
      if (a.defaultValue != b.defaultValue) {
        console.debug(
          `Column ${a.pureName}.${a.columnName}, ${b.pureName}.${b.columnName}: different default value: ${a.defaultValue}, ${b.defaultValue}`
        );

        // opts.DiffLogger.Trace(
        //   'Column {0}, {1}: different default values: {2}; {3}',
        //   a,
        //   b,
        //   a.DefaultValue,
        //   b.DefaultValue
        // );
        return false;
      }
    } else {
      if (a.defaultValue != b.defaultValue) {
        console.debug(
          `Column ${a.pureName}.${a.columnName}, ${b.pureName}.${b.columnName}: different default value: ${a.defaultValue}, ${b.defaultValue}`
        );

        // opts.DiffLogger.Trace(
        //   'Column {0}, {1}: different default values: {2}; {3}',
        //   a,
        //   b,
        //   a.DefaultValue,
        //   b.DefaultValue
        // );
        return false;
      }
    }
    if (a.defaultConstraint != b.defaultConstraint) {
      console.debug(
        `Column ${a.pureName}.${a.columnName}, ${b.pureName}.${b.columnName}: different default constraint: ${a.defaultConstraint}, ${b.defaultConstraint}`
      );

      // opts.DiffLogger.Trace(
      //   'Column {0}, {1}: different default constraint names: {2}; {3}',
      //   a,
      //   b,
      //   a.DefaultConstraint,
      //   b.DefaultConstraint
      // );
      return false;
    }
  }
  if ((a.notNull || false) != (b.notNull || false)) {
    console.debug(
      `Column ${a.pureName}.${a.columnName}, ${b.pureName}.${b.columnName}: different nullability: ${a.notNull}, ${b.notNull}`
    );

    // opts.DiffLogger.Trace('Column {0}, {1}: different nullable: {2}; {3}', a, b, a.NotNull, b.NotNull);
    return false;
  }
  if ((a.autoIncrement || false) != (b.autoIncrement || false)) {
    console.debug(
      `Column ${a.pureName}.${a.columnName}, ${b.pureName}.${b.columnName}: different autoincrement: ${a.autoIncrement}, ${b.autoIncrement}`
    );

    // opts.DiffLogger.Trace('Column {0}, {1}: different autoincrement: {2}; {3}', a, b, a.AutoIncrement, b.AutoIncrement);
    return false;
  }
  if ((a.isSparse || false) != (b.isSparse || false)) {
    console.debug(
      `Column ${a.pureName}.${a.columnName}, ${b.pureName}.${b.columnName}: different is_sparse: ${a.isSparse}, ${b.isSparse}`
    );

    // opts.DiffLogger.Trace('Column {0}, {1}: different is_sparse: {2}; {3}', a, b, a.IsSparse, b.IsSparse);
    return false;
  }

  if (!testEqualTypes(a, b, opts)) {
    return false;
  }

  //var btype = b.DataType;
  //var atype = a.DataType;
  //if (pairing != null && pairing.Target != null && pairing.Source.Dialect != null)
  //{
  //    btype = pairing.Source.Dialect.MigrateDataType(b, btype, pairing.Source.Dialect.GetDefaultMigrationProfile(), null);
  //    btype = pairing.Source.Dialect.GenericTypeToSpecific(btype).ToGenericType();

  //    // normalize type
  //    atype = pairing.Source.Dialect.GenericTypeToSpecific(atype).ToGenericType();
  //}
  //if (!EqualTypes(atype, btype, opts))
  //{
  //    opts.DiffLogger.Trace("Column {0}, {1}: different types: {2}; {3}", a, b, a.DataType, b.DataType);
  //    return false;
  //}
  //if (!opts.IgnoreColumnCollation && a.Collation != b.Collation)
  //{
  //    opts.DiffLogger.Trace("Column {0}, {1}: different collations: {2}; {3}", a, b, a.Collation, b.Collation);
  //    return false;
  //}
  //if (!opts.IgnoreColumnCharacterSet && a.CharacterSet != b.CharacterSet)
  //{
  //    opts.DiffLogger.Trace("Column {0}, {1}: different character sets: {2}; {3}", a, b, a.CharacterSet, b.CharacterSet);
  //    return false;
  //}
  return true;
}

function testEqualConstraints(a: ConstraintInfo, b: ConstraintInfo, opts: DbDiffOptions = {}) {
  const omitList = [];
  if (opts.ignoreForeignKeyActions) {
    omitList.push('updateAction');
    omitList.push('deleteAction');
  }
  if (opts.ignoreConstraintNames) {
    omitList.push('constraintName');
  }
  if (opts.schemaMode == 'ignore') {
    omitList.push('schemaName');
    omitList.push('refSchemaName');
  }

  // if (a.constraintType == 'primaryKey' && b.constraintType == 'primaryKey') {
  //   console.log('PK1', stableStringify(_.omit(a, omitList)));
  //   console.log('PK2', stableStringify(_.omit(b, omitList)));
  // }

  // if (a.constraintType == 'foreignKey' && b.constraintType == 'foreignKey') {
  //   console.log('FK1', stableStringify(_omit(a, omitList)));
  //   console.log('FK2', stableStringify(_omit(b, omitList)));
  // }

  // if (a.constraintType == 'index' && b.constraintType == 'index') {
  //   console.log('IX1', stableStringify(_omit(a, omitList)));
  //   console.log('IX2', stableStringify(_omit(b, omitList)));
  // }

  return stableStringify(_omit(a, omitList)) == stableStringify(_omit(b, omitList));
}

export function testEqualTypes(a: ColumnInfo, b: ColumnInfo, opts: DbDiffOptions = {}) {
  if (opts.ignoreDataTypes) {
    return true;
  }

  if ((a.dataType || '').toLowerCase() != (b.dataType || '').toLowerCase()) {
    console.debug(
      `Column ${a.pureName}.${a.columnName}, ${b.pureName}.${b.columnName}: different data type: ${a.dataType}, ${b.dataType}`
    );
    return false;
  }

  return true;
}

function getTableConstraints(table: TableInfo) {
  const res = [];
  if (table.primaryKey) res.push(table.primaryKey);
  if (table.foreignKeys) res.push(...table.foreignKeys);
  if (table.indexes) res.push(...table.indexes);
  if (table.uniques) res.push(...table.uniques);
  if (table.checks) res.push(...table.checks);
  return res;
}

function createPairs(oldList, newList, additionalCondition = null) {
  const res = [];
  for (const a of oldList) {
    const b = newList.find(x => x.pairingId == a.pairingId || (additionalCondition && additionalCondition(a, x)));
    if (b) {
      res.push([a, b]);
    } else {
      res.push([a, null]);
    }
  }
  for (const b of newList) {
    if (!res.find(x => x[1] == b)) {
      res.push([null, b]);
    }
  }
  return res;
}

function planTablePreload(plan: AlterPlan, oldTable: TableInfo, newTable: TableInfo) {
  const key = newTable.preloadedRowsKey || newTable.primaryKey?.columns?.map(x => x.columnName);
  if (newTable.preloadedRows?.length > 0 && key?.length > 0) {
    plan.fillPreloadedRows(newTable, oldTable?.preloadedRows, newTable.preloadedRows, key, newTable.preloadedRowsInsertOnly);
  }
}

function planAlterTable(plan: AlterPlan, oldTable: TableInfo, newTable: TableInfo, opts: DbDiffOptions) {
  // if (oldTable.primaryKey)

  const columnPairs = createPairs(oldTable.columns, newTable.columns);
  const constraintPairs = createPairs(
    getTableConstraints(oldTable),
    getTableConstraints(newTable),
    (a, b) => a.constraintType == 'primaryKey' && b.constraintType == 'primaryKey'
  );
  // console.log('constraintPairs SOURCE', getTableConstraints(oldTable), getTableConstraints(newTable));
  // console.log('constraintPairs', constraintPairs);

  if (!opts.noDropConstraint) {
    constraintPairs.filter(x => x[1] == null).forEach(x => plan.dropConstraint(x[0]));
  }
  if (!opts.noDropColumn) {
    columnPairs.filter(x => x[1] == null).forEach(x => plan.dropColumn(x[0]));
  }

  if (!testEqualFullNames(oldTable, newTable, opts) && !opts.noRenameTable) {
    plan.renameTable(oldTable, newTable.pureName);
  }

  columnPairs.filter(x => x[0] == null).forEach(x => plan.createColumn(x[1]));

  columnPairs
    .filter(x => x[0] && x[1])
    .forEach(x => {
      if (!testEqualColumns(x[0], x[1], true, true, opts)) {
        if (testEqualColumns(x[0], x[1], false, true, opts) && !opts.noRenameColumn) {
          // console.log('PLAN RENAME COLUMN')
          plan.renameColumn(x[0], x[1].columnName);
        } else {
          // console.log('PLAN CHANGE COLUMN')
          plan.changeColumn(x[0], x[1]);
        }
      }
    });

  constraintPairs
    .filter(x => x[0] && x[1])
    .forEach(x => {
      if (!testEqualConstraints(x[0], x[1], opts)) {
        // console.log('PLAN CHANGE CONSTRAINT', x[0], x[1]);
        plan.changeConstraint(x[0], x[1]);
      }
    });

  constraintPairs.filter(x => x[0] == null).forEach(x => plan.createConstraint(x[1]));

  planTablePreload(plan, oldTable, newTable);
}

export function testEqualTables(
  a: TableInfo,
  b: TableInfo,
  opts: DbDiffOptions,
  wholeOldDb: DatabaseInfo,
  wholeNewDb: DatabaseInfo,
  driver: EngineDriver
) {
  const plan = new AlterPlan(wholeOldDb, wholeNewDb, driver.dialect, opts);
  planAlterTable(plan, a, b, opts);
  // console.log('plan.operations', a, b, plan.operations);
  return plan.operations.length == 0;
}

export function testEqualSqlObjects(a: SqlObjectInfo, b: SqlObjectInfo, opts: DbDiffOptions) {
  return a.createSql == b.createSql;
}

export function createAlterTablePlan(
  oldTable: TableInfo,
  newTable: TableInfo,
  opts: DbDiffOptions,
  wholeOldDb: DatabaseInfo,
  wholeNewDb: DatabaseInfo,
  driver: EngineDriver
): AlterPlan {
  const plan = new AlterPlan(wholeOldDb, wholeNewDb, driver.dialect, opts);
  if (oldTable == null) {
    plan.createTable(newTable);
    planTablePreload(plan, null, newTable);
  } else if (newTable == null) {
    plan.dropTable(oldTable);
  } else {
    planAlterTable(plan, oldTable, newTable, opts);
  }
  plan.transformPlan();
  return plan;
}

export function createAlterDatabasePlan(
  oldDb: DatabaseInfo,
  newDb: DatabaseInfo,
  opts: DbDiffOptions,
  wholeOldDb: DatabaseInfo,
  wholeNewDb: DatabaseInfo,
  driver: EngineDriver
): AlterPlan {
  const plan = new AlterPlan(wholeOldDb, wholeNewDb, driver.dialect, opts);

  for (const objectTypeField of ['tables', 'views', 'procedures', 'matviews', 'functions']) {
    for (const oldobj of oldDb[objectTypeField] || []) {
      const newobj = (newDb[objectTypeField] || []).find(x => x.pairingId == oldobj.pairingId);
      if (objectTypeField == 'tables') {
        if (newobj == null) {
          if (!opts.noDropTable) {
            plan.dropTable(oldobj);
          }
        } else {
          planAlterTable(plan, oldobj, newobj, opts);
        }
      } else {
        if (newobj == null) {
          if (!opts.noDropSqlObject) {
            plan.dropSqlObject(oldobj);
          }
        } else if (!testEqualSqlObjects(oldobj.createSql, newobj.createSql, opts)) {
          plan.recreates.sqlObjects += 1;
          if (!opts.noDropSqlObject) {
            plan.dropSqlObject(oldobj);
          }
          plan.createSqlObject(newobj);
        }
      }
    }
    for (const newobj of newDb[objectTypeField] || []) {
      const oldobj = (oldDb[objectTypeField] || []).find(x => x.pairingId == newobj.pairingId);
      if (objectTypeField == 'tables') {
        if (oldobj == null) {
          plan.createTable(newobj);
          planTablePreload(plan, null, newobj);
        }
      } else {
        if (oldobj == null) plan.createSqlObject(newobj);
      }
    }
  }
  plan.transformPlan();
  return plan;
}

export function getAlterTableScript(
  oldTable: TableInfo,
  newTable: TableInfo,
  opts: DbDiffOptions,
  wholeOldDb: DatabaseInfo,
  wholeNewDb: DatabaseInfo,
  driver: EngineDriver
) {
  if ((!oldTable && !newTable) || !driver) {
    return { sql: '', recreates: [] };
  }

  const plan = createAlterTablePlan(oldTable, newTable, opts, wholeOldDb, wholeNewDb, driver);
  const dmp = driver.createDumper({ useHardSeparator: true });
  if (!driver.dialect.disableExplicitTransaction) dmp.beginTransaction();
  plan.run(dmp);
  if (!driver.dialect.disableExplicitTransaction) dmp.commitTransaction();
  return {
    sql: dmp.s,
    recreates: plan.recreates,
  };
}

export function getAlterDatabaseScript(
  oldDb: DatabaseInfo,
  newDb: DatabaseInfo,
  opts: DbDiffOptions,
  wholeOldDb: DatabaseInfo,
  wholeNewDb: DatabaseInfo,
  driver: EngineDriver
) {
  const plan = createAlterDatabasePlan(oldDb, newDb, opts, wholeOldDb, wholeNewDb, driver);
  const dmp = driver.createDumper({ useHardSeparator: true });
  if (!driver.dialect.disableExplicitTransaction) dmp.beginTransaction();
  plan.run(dmp);
  if (!driver.dialect.disableExplicitTransaction) dmp.commitTransaction();
  return {
    sql: dmp.s,
    recreates: plan.recreates,
    isEmpty: plan.operations.length == 0,
  };
}

export function matchPairedObjects(db1: DatabaseInfo, db2: DatabaseInfo, opts: DbDiffOptions) {
  if (!db1 || !db2) return null;

  const res = _cloneDeep(db2);

  for (const objectTypeField of ['tables', 'views', 'procedures', 'matviews', 'functions']) {
    for (const obj2 of res[objectTypeField] || []) {
      const obj1 = db1[objectTypeField].find(x => testEqualFullNames(x, obj2, opts));
      if (obj1) {
        obj2.pairingId = obj1.pairingId;

        if (objectTypeField == 'tables') {
          for (const col2 of obj2.columns) {
            const col1 = obj1.columns.find(x => testEqualNames(x.columnName, col2.columnName, opts));
            if (col1) col2.pairingId = col1.pairingId;
          }

          for (const fk2 of obj2.foreignKeys) {
            const fk1 = obj1.foreignKeys.find(
              x =>
                testEqualNames(x.refTableName, fk2.refTableName, opts) &&
                _isEqual(
                  x.columns.map(y => _pick(y, ['columnName', 'refColumnName'])),
                  fk2.columns.map(y => _pick(y, ['columnName', 'refColumnName']))
                )
            );
            if (fk1) fk2.pairingId = fk1.pairingId;
          }

          for (const uq2 of obj2.uniques) {
            const uq1 = obj1.uniques.find(x =>
              _isEqual(
                x.columns.map(y => _pick(y, ['columnName'])),
                uq2.columns.map(y => _pick(y, ['columnName']))
              )
            );
            if (uq1) uq2.pairingId = uq1.pairingId;
          }

          for (const ix2 of obj2.indexes) {
            const ix1 = obj1.indexes.find(x => testEqualNames(x.constraintName, ix2.constraintName, opts));
            if (ix1) ix2.pairingId = ix1.pairingId;
          }
        }
      }
    }
  }

  return res;
}

export const modelCompareDbDiffOptions: DbDiffOptions = {
  ignoreCase: true,
  schemaMode: 'ignore',
  ignoreConstraintNames: true,
  ignoreForeignKeyActions: true,
  ignoreDataTypes: true,
};
