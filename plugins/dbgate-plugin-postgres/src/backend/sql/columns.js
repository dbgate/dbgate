module.exports = `
select 
	table_schema as "schemaName", 
	table_name as "pureName", 
	column_name as "columnName",
	is_nullable as "isNullable",
	data_type as "dataType",
	character_maximum_length as "charMaxLength",
	numeric_precision as "numericPrecision",
	numeric_scale as "numericScale",
	column_default as "defaultValue"
from information_schema.columns
where 
		table_schema <> 'information_schema' 
		and table_schema <> 'pg_catalog' 
		and table_schema !~ '^pg_toast' 
		and 'tables:' || table_schema || '.' || table_name =OBJECT_ID_CONDITION
order by ordinal_position
`;