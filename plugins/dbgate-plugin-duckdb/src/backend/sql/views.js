module.exports = `
select 
  table_name as "pure_name",
  table_schema as "schema_name",
  view_definition as "create_sql",
  md5(view_definition) as "hash_code"
from
  information_schema.views 
where
  table_schema =SCHEMA_NAME_CONDITION
  and table_catalog not in('temp', 'system')
  and table_name not like 'duckdb_%'
  and table_name not like 'sqlite_%'
  and table_name not like 'pragma_%'
`;
