module.exports = `
select infoTables.table_schema as "schema_name", infoTables.table_name as "pure_name"
from information_schema.tables infoTables 
where infoTables.table_type not like '%VIEW%' 
  and ('tables:' || infoTables.table_schema || '.' ||  infoTables.table_name) =OBJECT_ID_CONDITION
and infoTables.table_schema <> 'pg_catalog'
and infoTables.table_schema <> 'information_schema'
and infoTables.table_schema <> 'pg_internal'
and infoTables.table_schema !~ '^pg_toast'
and infoTables.table_schema !~ '^_timescaledb_' 
`;
