module.exports = `
select 
  matviewname as "pure_name",
  schemaname as "schema_name",
  md5(definition) as "hash_code"
from
  pg_catalog.pg_matviews WHERE schemaname NOT LIKE 'pg_%' 
`;
