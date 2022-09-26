module.exports = `
select ao.owner as "schema_name", ao.object_name as "pure_name"
from all_objects ao
where exists(select null from user_objects uo where uo.object_id = ao.object_id)
and object_type = 'TABLE'
`;
/*
module.exports = `
select infoTables.table_schema as "schema_name", infoTables.table_name as "pure_name"
from information_schema.tables infoTables
where infoTables.table_type not like '%VIEW%'
  and ('tables:' || infoTables.table_schema || '.' ||  infoTables.table_name) =OBJECT_ID_CONDITION
and infoTables.table_schema <> 'pg_catalog'
and infoTables.table_schema <> 'information_schema'
and infoTables.table_schema <> 'pg_internal'
and infoTables.table_schema !~ '^pg_toast'
`;
*/
