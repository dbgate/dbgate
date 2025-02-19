module.exports = `
select 
  matviewname as "pure_name",
  schemaname as "schema_name",
  $md5Function(definition) as "hash_code"
from
  pg_catalog.pg_matviews WHERE schemaname NOT LIKE 'pg_%'  AND schemaname =SCHEMA_NAME_CONDITION
`;
