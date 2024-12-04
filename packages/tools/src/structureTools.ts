import type {
  DatabaseInfo,
  TableInfo,
  ApplicationDefinition,
  ViewInfo,
  CollectionInfo,
  NamedObjectInfo,
} from 'dbgate-types';
import _flatten from 'lodash/flatten';
import _uniq from 'lodash/uniq';
import _keys from 'lodash/keys';

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
    sortingKey: table.sortingKey
      ? {
          ...table.sortingKey,
          pureName: table.pureName,
          schemaName: table.schemaName,
          constraintType: 'sortingKey',
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
      parameters: (obj.parameters || []).map(param => ({
        ...param,
        pureName: obj.pureName,
        schemaName: obj.schemaName,
      })),
    })),
    functions: (db.functions || []).map(obj => ({
      ...obj,
      objectTypeField: 'functions',
      parameters: (obj.parameters || []).map(param => ({
        ...param,
        pureName: obj.pureName,
        schemaName: obj.schemaName,
      })),
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

export function filterStructureBySchema(db: DatabaseInfo, schema: string) {
  if (!db) {
    return db;
  }

  return {
    ...db,
    tables: (db.tables || []).filter(x => x.schemaName == schema),
    views: (db.views || []).filter(x => x.schemaName == schema),
    collections: (db.collections || []).filter(x => x.schemaName == schema),
    matviews: (db.matviews || []).filter(x => x.schemaName == schema),
    procedures: (db.procedures || []).filter(x => x.schemaName == schema),
    functions: (db.functions || []).filter(x => x.schemaName == schema),
    triggers: (db.triggers || []).filter(x => x.schemaName == schema),
  };
}

export function getSchemasUsedByStructure(db: DatabaseInfo) {
  if (!db) {
    return db;
  }

  return _uniq([
    ...(db.tables || []).map(x => x.schemaName),
    ...(db.views || []).map(x => x.schemaName),
    ...(db.collections || []).map(x => x.schemaName),
    ...(db.matviews || []).map(x => x.schemaName),
    ...(db.procedures || []).map(x => x.schemaName),
    ...(db.functions || []).map(x => x.schemaName),
    ...(db.triggers || []).map(x => x.schemaName),
  ]);
}

export function replaceSchemaInStructure(db: DatabaseInfo, schema: string) {
  if (!db) {
    return db;
  }

  return {
    ...db,
    tables: (db.tables || []).map(tbl => ({
      ...tbl,
      schemaName: schema,
      columns: (tbl.columns || []).map(column => ({ ...column, schemaName: schema })),
      primaryKey: tbl.primaryKey ? { ...tbl.primaryKey, schemaName: schema } : undefined,
      sortingKey: tbl.sortingKey ? { ...tbl.sortingKey, schemaName: schema } : undefined,
      foreignKeys: (tbl.foreignKeys || []).map(fk => ({ ...fk, refSchemaName: schema, schemaName: schema })),
      indexes: (tbl.indexes || []).map(idx => ({ ...idx, schemaName: schema })),
      uniques: (tbl.uniques || []).map(idx => ({ ...idx, schemaName: schema })),
      checks: (tbl.checks || []).map(idx => ({ ...idx, schemaName: schema })),
    })),
    views: (db.views || []).map(x => ({ ...x, schemaName: schema })),
    collections: (db.collections || []).map(x => ({ ...x, schemaName: schema })),
    matviews: (db.matviews || []).map(x => ({ ...x, schemaName: schema })),
    procedures: (db.procedures || []).map(x => ({ ...x, schemaName: schema })),
    functions: (db.functions || []).map(x => ({ ...x, schemaName: schema })),
    triggers: (db.triggers || []).map(x => ({ ...x, schemaName: schema })),
  };
}

export function skipNamesInStructureByRegex(db: DatabaseInfo, regex: RegExp) {
  if (!db) {
    return db;
  }

  return {
    ...db,
    tables: (db.tables || []).filter(x => !regex.test(x.pureName)),
    views: (db.views || []).filter(x => !regex.test(x.pureName)),
    collections: (db.collections || []).filter(x => !regex.test(x.pureName)),
    matviews: (db.matviews || []).filter(x => !regex.test(x.pureName)),
    procedures: (db.procedures || []).filter(x => !regex.test(x.pureName)),
    functions: (db.functions || []).filter(x => !regex.test(x.pureName)),
    triggers: (db.triggers || []).filter(x => !regex.test(x.pureName)),
  };
}

export function detectChangesInPreloadedRows(oldTable: TableInfo, newTable: TableInfo): boolean {
  const key =
    newTable?.preloadedRowsKey ||
    oldTable?.preloadedRowsKey ||
    newTable?.primaryKey?.columns?.map(x => x.columnName) ||
    oldTable?.primaryKey?.columns?.map(x => x.columnName);
  const oldRows = oldTable?.preloadedRows || [];
  const newRows = newTable?.preloadedRows || [];
  const insertOnly = newTable?.preloadedRowsInsertOnly || oldTable?.preloadedRowsInsertOnly;

  if (newRows.length != oldRows.length) {
    return true;
  }

  for (const row of newRows) {
    const old = oldRows?.find(r => key.every(col => r[col] == row[col]));
    const rowKeys = _keys(row);
    if (old) {
      const updated = [];
      for (const col of rowKeys) {
        if (row[col] != old[col] && !insertOnly?.includes(col)) {
          updated.push(col);
        }
      }
      if (updated.length > 0) {
        return true;
      }
    } else {
      return true;
    }
  }

  for (const row of oldRows || []) {
    const newr = oldRows?.find(r => key.every(col => r[col] == row[col]));
    if (!newr) {
      return true;
    }
  }

  return false;
}

export function removePreloadedRowsFromStructure(db: DatabaseInfo): DatabaseInfo {
  if (!db) {
    return db;
  }

  return {
    ...db,
    tables: (db.tables || []).map(tbl => ({
      ...tbl,
      preloadedRows: undefined,
      preloadedRowsKey: undefined,
      preloadedRowsInsertOnly: undefined,
    })),
  };
}

export function skipDbGateInternalObjects(db: DatabaseInfo) {
  return {
    ...db,
    tables: (db.tables || []).filter(tbl => tbl.pureName != 'dbgate_deploy_journal'),
  };
}
