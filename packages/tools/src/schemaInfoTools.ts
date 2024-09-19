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
