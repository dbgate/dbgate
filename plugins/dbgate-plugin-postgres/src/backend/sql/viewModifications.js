module.exports = `
select 
  table_name as "pure_name",
  table_schema as "schema_name",
  $md5Function(view_definition) as "hash_code"
from
  information_schema.views where table_schema != 'information_schema' and table_schema != 'pg_catalog' and table_schema !~ '^_timescaledb_' and table_schema =SCHEMA_NAME_CONDITION
`;
