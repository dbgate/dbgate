import { ColumnInfo, DatabaseInfo, TableInfo } from 'dbgate-types';
import uuidv1 from 'uuid/v1';
import { AlterPlan } from './alterPlan';

export interface DbDiffOptions {
  allowRecreateTable: boolean;
  allowRecreateConstraint: boolean;
  allowRecreateSpecificObject: boolean;
  allowPairRenamedTables: boolean;
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
    const b = newList.find(x => x.pairingId == a.pairingId || (additionalCondition && additionalCondition(a, b)));
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

function planAlterTable(plan: AlterPlan, oldTable: TableInfo, newTable: TableInfo, options: DbDiffOptions) {
  // if (oldTable.primaryKey)

  const constraintPairs = createPairs(
    getTableConstraints(oldTable),
    getTableConstraints(newTable),
    (a, b) => a.constraintType == 'primaryKey' && b.constraintType == 'primaryKey'
  );
  const columnPairs = createPairs(oldTable.columns, newTable.columns);

  constraintPairs.filter(x => x[1] == null).forEach(x => plan.dropConstraint(x));
}

export function createAlterTablePlan(
  oldTable: TableInfo,
  newTable: TableInfo,
  options: DbDiffOptions,
  db: DatabaseInfo
): AlterPlan {
  const plan = new AlterPlan(db);
  if (oldTable == null) {
    plan.createTable(newTable);
  } else {
    planAlterTable(plan, oldTable, newTable, options);
  }
  return plan;
}
