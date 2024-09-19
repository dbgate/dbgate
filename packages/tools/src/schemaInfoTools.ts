import { SchemaInfo, SqlDialect } from 'dbgate-types';

export function findDefaultSchema(schemaList: SchemaInfo[], dialect: SqlDialect) {
  if (!schemaList) {
    return null;
  }
  const dynamicDefaultSchema = schemaList.find(x => x.isDefault);
  if (dynamicDefaultSchema) {
    return dynamicDefaultSchema.schemaName;
  }
  if (dialect.defaultSchemaName && schemaList.find(x => x.schemaName == dialect.defaultSchemaName)) {
    return dialect.defaultSchemaName;
  }
  return schemaList[0]?.schemaName;
}

export function isCompositeDbName(name: string) {
  return name?.includes('::');
}

export function splitCompositeDbName(name: string) {
  const [database, schema] = name.split('::');
  return { database, schema };
}

export function extractDbNameFromComposite(name: string) {
  return isCompositeDbName(name) ? splitCompositeDbName(name).database : name;
}
