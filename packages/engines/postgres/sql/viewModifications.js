module.exports = `
select 
  table_name as "pureName",
  table_schema as "schemaName",
  md5(view_definition) as "hashCode"
from
  information_schema.views where table_schema != 'information_schema' and table_schema != 'pg_catalog'
`;
