module.exports = `
select 
  routine_name as "pureName",
  routine_schema as "schemaName",
  routine_definition as "createSql",
  md5(routine_definition) as "hashCode",
  routine_type as "objectType"
from
  information_schema.routines where routine_schema != 'information_schema' and routine_schema != 'pg_catalog' and routine_type is not null
`;
