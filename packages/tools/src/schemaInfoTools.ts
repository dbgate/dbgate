import { SchemaInfo, SqlDialect } from 'dbgate-types';

export function findDefaultSchema(schemaList: SchemaInfo[], dialect: SqlDialect, schemaInStorage: string = null) {
  if (!schemaList) {
    return null;
  }

  if (schemaInStorage && schemaList.find(x => x.schemaName == schemaInStorage)) {
    return schemaInStorage;
  }

  const dynamicDefaultSchema = schemaList.find(x => x.isDefault);
  if (dynamicDefaultSchema) {
    return dynamicDefaultSchema.schemaName;
  }
  if (dialect?.defaultSchemaName && schemaList.find(x => x.schemaName == dialect.defaultSchemaName)) {
    return dialect.defaultSchemaName;
  }
  return schemaList[0]?.schemaName;
}

export function isCompositeDbName(name: string) {
  return name?.includes('::');
}

export function splitCompositeDbName(name: string) {
  if (!isCompositeDbName(name)) return null;
  const [database, schema] = name.split('::');
  return { database, schema };
}

export function extractDbNameFromComposite(name: string) {
  return isCompositeDbName(name) ? splitCompositeDbName(name).database : name;
}

export function extractSchemaNameFromComposite(name: string) {
  return splitCompositeDbName(name)?.schema;
}

export function dbNameLogCategory(database: string): string {
  if (isCompositeDbName(database)) {
    return '~composite';
  }
  if (database) {
    return '~simple';
  }
  return '~nodb';
}

export function compositeDbNameIfNeeded(
  connnection: { useSeparateSchemas: boolean },
  database: string,
  schema: string
) {
  if (connnection?.useSeparateSchemas) {
    return `${database}::${schema}`;
  }
  return database;
}
