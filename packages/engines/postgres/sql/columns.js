module.exports = `
select 
	table_schema as "schemaName", 
	table_name as "pureName", 
	column_name as "columnName",
	is_nullable as "isNullable",
	data_type as dataType,
	character_maximum_length,
	numeric_precision,
	numeric_scale,
	column_default
from information_schema.columns
where 
		table_schema <> 'information_schema' 
		and table_schema <> 'pg_catalog' 
		and table_schema !~ '^pg_toast' 
		and 'table:' || table_schema || '.' || table_name =[OBJECT_ID_CONDITION]
order by ordinal_position
`;