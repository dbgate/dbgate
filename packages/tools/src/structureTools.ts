import { DatabaseInfo } from 'dbgate-types';
import _ from 'lodash';

export function addTableDependencies(db: DatabaseInfo): DatabaseInfo {
  const allForeignKeys = _.flatten(db.tables.map(x => x.foreignKeys || []));
  return {
    ...db,
    tables: db.tables.map(table => ({
      ...table,
      dependencies: allForeignKeys.filter(x => x.refSchemaName == table.schemaName && x.refTableName == table.pureName),
    })),
  };
}

function fillTableExtendedInfo(db: DatabaseInfo): DatabaseInfo {
  return {
    ...db,
    tables: (db.tables || []).map(obj => ({
      ...obj,
      objectTypeField: 'tables',
      columns: (obj.columns || []).map(column => ({
        pureName: obj.pureName,
        schemaName: obj.schemaName,
        ...column,
      })),
      primaryKey: obj.primaryKey
        ? {
            ...obj.primaryKey,
            pureName: obj.pureName,
            schemaName: obj.schemaName,
            constraintType: 'primaryKey',
          }
        : undefined,
      foreignKeys: (obj.foreignKeys || []).map(cnt => ({
        ...cnt,
        pureName: obj.pureName,
        schemaName: obj.schemaName,
        constraintType: 'foreignKey',
      })),
      indexes: (obj.indexes || []).map(cnt => ({
        ...cnt,
        pureName: obj.pureName,
        schemaName: obj.schemaName,
        constraintType: 'index',
      })),
      checks: (obj.checks || []).map(cnt => ({
        ...cnt,
        pureName: obj.pureName,
        schemaName: obj.schemaName,
        constraintType: 'check',
      })),
      uniques: (obj.uniques || []).map(cnt => ({
        ...cnt,
        pureName: obj.pureName,
        schemaName: obj.schemaName,
        constraintType: 'unique',
      })),
    })),
    views: (db.views || []).map(obj => ({
      ...obj,
      objectTypeField: 'views',
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
  return fillTableExtendedInfo(addTableDependencies(db));
}
