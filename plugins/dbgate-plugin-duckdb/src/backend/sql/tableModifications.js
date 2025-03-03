module.exports = `
select infoTables.table_schema as "schema_name", infoTables.table_name as "pure_name", 
    (
        select $md5Function(string_agg(
            infoColumns.column_name || '|' || infoColumns.data_type || '|' || infoColumns.is_nullable::varchar(255)  || '|' || coalesce(infoColumns.character_maximum_length, -1)::varchar(255) 
                || '|' || coalesce(infoColumns.numeric_precision, -1)::varchar(255) ,
            ',' order by infoColumns.ordinal_position
        )) as "hash_code_columns"
        from information_schema.columns infoColumns 
        where infoColumns.table_schema = infoTables.table_schema and infoColumns.table_name = infoTables.table_name
    ),
    (
        select $md5Function(string_agg(
            infoConstraints.constraint_name || '|' || infoConstraints.constraint_type ,
            ',' order by infoConstraints.constraint_name
        )) as "hash_code_constraints"
        from information_schema.table_constraints infoConstraints 
        where infoConstraints.table_schema = infoTables.table_schema and infoConstraints.table_name = infoTables.table_name
    )
    
from information_schema.tables infoTables 
where infoTables.table_type not like '%VIEW%' 
  and ('tables:' || infoTables.table_schema || '.' ||  infoTables.table_name) =OBJECT_ID_CONDITION
and infoTables.table_schema <> 'pg_internal'
and infoTables.table_schema !~ '^_timescaledb_'
and infoTables.table_schema =SCHEMA_NAME_CONDITION
`;
