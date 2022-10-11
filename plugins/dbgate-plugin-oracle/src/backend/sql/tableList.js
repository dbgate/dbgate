module.exports = `
select infoTables.table_schema as "schema_name", infoTables.table_name as "pure_name"
from (
  select
    sys_context('userenv', 'DB_NAME')       table_catalog,
    owner                                   table_schema,
    table_name                              table_name,
    case
    when iot_type  = 'Y' then 'IOT'
    when temporary = 'Y' then 'TEMP'
    else                      'BASE TABLE'
    end                                     table_type
  from
    all_tables
union all
 select
    sys_context('userenv', 'DB_NAME')       table_catalog,
    owner                                   table_schema,
    view_name                               table_name,
   'VIEW'                                   table_type
from
  all_views
) infoTables
where infoTables.table_type not like '%VIEW%'
and table_name =OBJECT_ID_CONDITION
`;

