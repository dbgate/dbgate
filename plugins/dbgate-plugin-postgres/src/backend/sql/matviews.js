module.exports = `
select 
  matviewname as "pure_name",
  schemaname as "schema_name",
  definition as "definition",
  $md5Function(definition) as "hash_code"
from
  pg_catalog.pg_matviews WHERE schemaname NOT LIKE 'pg_%' 
  and ('matviews:' || schemaname || '.' ||  matviewname) =OBJECT_ID_CONDITION
  and schemaname =SCHEMA_NAME_CONDITION
`;
