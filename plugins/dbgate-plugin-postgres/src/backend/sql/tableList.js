module.exports = `
select infoTables.table_schema as "schema_name", infoTables.table_name as "pure_name", 
  pg_relation_size('"'||infoTables.table_schema||'"."'||infoTables.table_name||'"') as "size_bytes"
from information_schema.tables infoTables 
where infoTables.table_type not like '%VIEW%' 
  and ('tables:' || infoTables.table_schema || '.' ||  infoTables.table_name) =OBJECT_ID_CONDITION
and infoTables.table_schema <> 'pg_internal'
and infoTables.table_schema !~ '^_timescaledb_'
and infoTables.table_schema =SCHEMA_NAME_CONDITION
`;
