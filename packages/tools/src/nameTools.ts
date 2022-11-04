import _cloneDeep from 'lodash/cloneDeep';
import _isString from 'lodash/isString';
import type {
  ColumnInfo,
  ColumnReference,
  DatabaseInfo,
  DatabaseInfoObjects,
  NamedObjectInfo,
  SqlDialect,
  TableInfo,
} from 'dbgate-types';

export function fullNameFromString(name) {
  const m = name.match(/\[([^\]]+)\]\.\[([^\]]+)\]/);
  if (m) {
    return {
      schemaName: m[1],
      pureName: m[2],
    };
  }
  return {
    schemaName: null,
    pureName: name,
  };
}

export function fullNameToString({ schemaName, pureName }) {
  if (schemaName) {
    return `[${schemaName}].[${pureName}]`;
  }
  return pureName;
}

export function fullNameToLabel({ schemaName, pureName }) {
  if (schemaName) {
    return `${schemaName}.${pureName}`;
  }
  return pureName;
}

export function quoteFullName(dialect, { schemaName, pureName }) {
  if (schemaName) return `${dialect.quoteIdentifier(schemaName)}.${dialect.quoteIdentifier(pureName)}`;
  return `${dialect.quoteIdentifier(pureName)}`;
}

export function equalStringLike(s1, s2) {
  return (s1 || '').toLowerCase().trim() == (s2 || '').toLowerCase().trim();
}

export function equalFullName(name1: NamedObjectInfo, name2: NamedObjectInfo) {
  if (!name1 || !name2) return name1 == name2;
  return name1.pureName == name2.pureName && name1.schemaName == name2.schemaName;
}

export function findObjectLike(
  { pureName, schemaName },
  dbinfo: DatabaseInfo,
  objectTypeField: keyof DatabaseInfoObjects
) {
  if (!dbinfo) return null;
  if (schemaName) {
    // @ts-ignore
    return dbinfo[objectTypeField]?.find(
      x => equalStringLike(x.pureName, pureName) && equalStringLike(x.schemaName, schemaName)
    );
  }
  // @ts-ignore
  return dbinfo[objectTypeField]?.find(x => equalStringLike(x.pureName, pureName));
}

export function findForeignKeyForColumn(table: TableInfo, column: ColumnInfo | string) {
  if (_isString(column)) {
    return (table.foreignKeys || []).find(fk => fk.columns.find(col => col.columnName == column));
  }
  return (table.foreignKeys || []).find(fk => fk.columns.find(col => col.columnName == column.columnName));
}

export function makeUniqueColumnNames(res: ColumnInfo[]) {
  const usedNames = new Set();
  for (let i = 0; i < res.length; i++) {
    if (usedNames.has(res[i].columnName)) {
      let suffix = 2;
      while (usedNames.has(`${res[i].columnName}${suffix}`)) suffix++;
      res[i].columnName = `${res[i].columnName}${suffix}`;
    }
    usedNames.add(res[i].columnName);
  }
}

function columnsConstraintName(prefix: string, table: TableInfo, columns: ColumnReference[]) {
  return `${prefix}_${table.pureName}_${columns.map(x => x.columnName.replace(' ', '_')).join('_')}`;
}

export function fillConstraintNames(table: TableInfo, dialect: SqlDialect) {
  if (!table) return table;
  const res = _cloneDeep(table);
  if (res.primaryKey && !res.primaryKey.constraintName && !dialect.anonymousPrimaryKey) {
    res.primaryKey.constraintName = `PK_${res.pureName}`;
  }
  for (const fk of res.foreignKeys || []) {
    if (fk.constraintName) continue;
    fk.constraintName = columnsConstraintName('FK', res, fk.columns);
  }
  for (const ix of res.indexes || []) {
    if (ix.constraintName) continue;
    ix.constraintName = columnsConstraintName('IX', res, ix.columns);
  }
  for (const uq of res.uniques || []) {
    if (uq.constraintName) continue;
    uq.constraintName = columnsConstraintName('UQ', res, uq.columns);
  }
  return res;
}
