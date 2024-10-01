module.exports = `
select 
  table_name as "pure_name",
  table_schema as "schema_name",
  view_definition as "create_sql",
  $md5Function(view_definition) as "hash_code"
from
  information_schema.views 
where table_schema !~ '^_timescaledb_' and table_schema =SCHEMA_NAME_CONDITION
  and ('views:' || table_schema || '.' ||  table_name) =OBJECT_ID_CONDITION
`;
