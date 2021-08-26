import { ColumnInfo, DatabaseInfo, EngineDriver, NamedObjectInfo, TableInfo } from 'dbgate-types';
import uuidv1 from 'uuid/v1';
import { AlterPlan } from './alterPlan';

type DbDiffSchemaMode = 'strict' | 'ignore' | 'ignoreImplicit';

export interface DbDiffOptions {
  allowRecreateTable?: boolean;
  allowRecreateConstraint?: boolean;
  allowRecreateSpecificObject?: boolean;
  allowPairRenamedTables?: boolean;

  ignoreCase?: boolean;
  schemaMode?: DbDiffSchemaMode;
  leftImplicitSchema?: string;
  rightImplicitSchema?: string;
}

export function generateTablePairingId(table: TableInfo): TableInfo {
  if (!table) return table;
  if (!table.pairingId) {
    return {
      ...table,
      columns: table.columns.map(col => ({
        ...col,
        pairingId: col.pairingId || uuidv1(),
      })),
      foreignKeys: table.foreignKeys.map(cnt => ({
        ...cnt,
        pairingId: cnt.pairingId || uuidv1(),
      })),
      checks: table.checks.map(cnt => ({
        ...cnt,
        pairingId: cnt.pairingId || uuidv1(),
      })),
      indexes: table.indexes.map(cnt => ({
        ...cnt,
        pairingId: cnt.pairingId || uuidv1(),
      })),
      pairingId: table.pairingId || uuidv1(),
    };
  }
  return table;
}

export function generateDbPairingId(db: DatabaseInfo): DatabaseInfo {
  if (!db) return db;
  return {
    ...db,
    tables: (db.tables || []).map(generateTablePairingId),
  };
}

function testEqualNames(a: string, b: string, opts: DbDiffOptions) {
  if (opts.ignoreCase) return a.toLowerCase() == b.toLowerCase();
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
  if (a.notNull != b.notNull) {
    // opts.DiffLogger.Trace('Column {0}, {1}: different nullable: {2}; {3}', a, b, a.NotNull, b.NotNull);
    return false;
  }
  if (a.autoIncrement != b.autoIncrement) {
    // opts.DiffLogger.Trace('Column {0}, {1}: different autoincrement: {2}; {3}', a, b, a.AutoIncrement, b.AutoIncrement);
    return false;
  }
  if (a.isSparse != b.isSparse) {
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

export function testEqualTypes(a: ColumnInfo, b: ColumnInfo, opts: DbDiffOptions = {}) {
  if (a.dataType != b.dataType) {
    // opts.DiffLogger.Trace("Column {0}, {1}: different types: {2}; {3}", a, b, a.DataType, b.DataType);
    return false;
  }

  //if (a.Length != b.Length)
  //{
  //    opts.DiffLogger.Trace("Column {0}, {1}: different lengths: {2}; {3}", a, b, a.Length, b.Length);
  //    return false;
  //}

  //if (a.Precision != b.Precision)
  //{
  //    opts.DiffLogger.Trace("Column {0}, {1}: different lengths: {2}; {3}", a, b, a.Precision, b.Precision);
  //    return false;
  //}

  //if (a.Scale != b.Scale)
  //{
  //    opts.DiffLogger.Trace("Column {0}, {1}: different scale: {2}; {3}", a, b, a.Scale, b.Scale);
  //    return false;
  //}

  return true;
}

function getTableConstraints(table: TableInfo) {
  const res = [];
  if (table.primaryKey) res.push(table.primaryKey);
  if (table.foreignKeys) res.push(...table.foreignKeys);
  if (table.indexes) res.push(...table.indexes);
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

function planAlterTable(plan: AlterPlan, oldTable: TableInfo, newTable: TableInfo, opts: DbDiffOptions) {
  // if (oldTable.primaryKey)

  const columnPairs = createPairs(oldTable.columns, newTable.columns);
  const constraintPairs = createPairs(
    getTableConstraints(oldTable),
    getTableConstraints(newTable),
    (a, b) => a.constraintType == 'primaryKey' && b.constraintType == 'primaryKey'
  );

  constraintPairs.filter(x => x[1] == null).forEach(x => plan.dropConstraint(x[0]));
  columnPairs.filter(x => x[1] == null).forEach(x => plan.dropColumn(x[0]));

  if (!testEqualFullNames(oldTable, newTable, opts)) {
    plan.renameTable(oldTable, newTable.pureName);
  }

  columnPairs.filter(x => x[0] == null).forEach(x => plan.createColumn(x[1]));

  columnPairs
    .filter(x => x[0] && x[1])
    .forEach(x => {
      if (!testEqualColumns(x[0], x[1], true, true, opts)) {
        if (testEqualColumns(x[0], x[1], false, true, opts)) {
          // console.log('PLAN RENAME COLUMN')
          plan.renameColumn(x[0], x[1].columnName);
        } else {
          // console.log('PLAN CHANGE COLUMN')
          plan.changeColumn(x[0], x[1]);
        }
      }
    });

  constraintPairs.filter(x => x[0] == null).forEach(x => plan.createConstraint(x[1]));
}

export function createAlterTablePlan(
  oldTable: TableInfo,
  newTable: TableInfo,
  opts: DbDiffOptions,
  db: DatabaseInfo,
  driver: EngineDriver
): AlterPlan {
  const plan = new AlterPlan(db, driver.dialect);
  if (oldTable == null) {
    plan.createTable(newTable);
  } else {
    planAlterTable(plan, oldTable, newTable, opts);
  }
  plan.transformPlan();
  return plan;
}

export function getAlterTableScript(
  oldTable: TableInfo,
  newTable: TableInfo,
  opts: DbDiffOptions,
  db: DatabaseInfo,
  driver: EngineDriver
): string {
  const plan = createAlterTablePlan(oldTable, newTable, opts, db, driver);
  const dmp = driver.createDumper();
  plan.run(dmp);
  return dmp.s;
}
