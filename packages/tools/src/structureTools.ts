import { DatabaseInfo } from 'dbgate-types';
import _ from 'lodash';

export function addTableDependencies(db: DatabaseInfo): DatabaseInfo {
  const allForeignKeys = _.flatten(db.tables.map(x => x.foreignKeys));
  return {
    ...db,
    tables: db.tables.map(table => ({
      ...table,
      dependencies: allForeignKeys.filter(x => x.refSchemaName == table.schemaName && x.refTableName == table.pureName),
    })),
  };
}

function fillTableExtendedInfo(db: DatabaseInfo) {
  return {
    ...db,
    tables: db.tables.map(table => ({
      ...table,
      columns: (table.columns || []).map(column => ({
        pureName: table.pureName,
        schemaName: table.schemaName,
        ...column,
      })),
    })),
  };
}

export function extendDatabaseInfo(db: DatabaseInfo): DatabaseInfo {
  return fillTableExtendedInfo(addTableDependencies(db));
}
