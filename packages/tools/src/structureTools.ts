import type { DatabaseInfo, TableInfo, ApplicationDefinition, ViewInfo, CollectionInfo } from 'dbgate-types';
import _flatten from 'lodash/flatten';

export function addTableDependencies(db: DatabaseInfo): DatabaseInfo {
  if (!db.tables) {
    return db;
  }
  
  const allForeignKeys = _flatten(db.tables.map(x => x.foreignKeys || []));
  return {
    ...db,
    tables: db.tables.map(table => ({
      ...table,
      dependencies: allForeignKeys.filter(x => x.refSchemaName == table.schemaName && x.refTableName == table.pureName),
    })),
  };
}

export function extendTableInfo(table: TableInfo): TableInfo {
  return {
    ...table,
    objectTypeField: 'tables',
    columns: (table.columns || []).map(column => ({
      pureName: table.pureName,
      schemaName: table.schemaName,
      ...column,
    })),
    primaryKey: table.primaryKey
      ? {
          ...table.primaryKey,
          pureName: table.pureName,
          schemaName: table.schemaName,
          constraintType: 'primaryKey',
        }
      : undefined,
    foreignKeys: (table.foreignKeys || []).map(cnt => ({
      ...cnt,
      pureName: table.pureName,
      schemaName: table.schemaName,
      constraintType: 'foreignKey',
    })),
    indexes: (table.indexes || []).map(cnt => ({
      ...cnt,
      pureName: table.pureName,
      schemaName: table.schemaName,
      constraintType: 'index',
    })),
    checks: (table.checks || []).map(cnt => ({
      ...cnt,
      pureName: table.pureName,
      schemaName: table.schemaName,
      constraintType: 'check',
    })),
    uniques: (table.uniques || []).map(cnt => ({
      ...cnt,
      pureName: table.pureName,
      schemaName: table.schemaName,
      constraintType: 'unique',
    })),
  };
}

function fillDatabaseExtendedInfo(db: DatabaseInfo): DatabaseInfo {
  return {
    ...db,
    tables: (db.tables || []).map(extendTableInfo),
    collections: (db.collections || []).map(obj => ({
      ...obj,
      objectTypeField: 'collections',
    })),
    views: (db.views || []).map(obj => ({
      ...obj,
      objectTypeField: 'views',
    })),
    matviews: (db.matviews || []).map(obj => ({
      ...obj,
      objectTypeField: 'matviews',
    })),
    procedures: (db.procedures || []).map(obj => ({
      ...obj,
      objectTypeField: 'procedures',
    })),
    functions: (db.functions || []).map(obj => ({
      ...obj,
      objectTypeField: 'functions',
    })),
    triggers: (db.triggers || []).map(obj => ({
      ...obj,
      objectTypeField: 'triggers',
    })),
  };
}

export function extendDatabaseInfo(db: DatabaseInfo): DatabaseInfo {
  return fillDatabaseExtendedInfo(addTableDependencies(db));
}

export function extendDatabaseInfoFromApps(db: DatabaseInfo, apps: ApplicationDefinition[]): DatabaseInfo {
  if (!db || !apps) return db;
  const dbExt = {
    ...db,
    tables: db.tables.map(table => ({
      ...table,
      foreignKeys: [
        ...(table.foreignKeys || []),
        ..._flatten(apps.map(app => app.virtualReferences || []))
          .filter(fk => fk.pureName == table.pureName && fk.schemaName == table.schemaName)
          .map(fk => ({ ...fk, constraintType: 'foreignKey', isVirtual: true })),
      ],
    })),
  } as DatabaseInfo;
  return addTableDependencies(dbExt);
}

export function isTableColumnUnique(table: TableInfo, column: string) {
  if (table.primaryKey && table.primaryKey.columns.length == 1 && table.primaryKey.columns[0].columnName == column) {
    return true;
  }
  const uqs = [...(table.uniques || []), ...(table.indexes || []).filter(x => x.isUnique)];
  if (uqs.find(uq => uq.columns.length == 1 && uq.columns[0].columnName == column)) {
    return true;
  }
  return false;
}

export function isTableInfo(obj: { objectTypeField?: string }): obj is TableInfo {
  return obj.objectTypeField == 'tables';
}

export function isViewInfo(obj: { objectTypeField?: string }): obj is ViewInfo {
  return obj.objectTypeField == 'views';
}

export function isCollectionInfo(obj: { objectTypeField?: string }): obj is CollectionInfo {
  return obj.objectTypeField == 'collections';
}
