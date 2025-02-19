module.exports = `
select 
	table_schema as "schema_name", 
	table_name as "pure_name", 
	column_name as "column_name",
	is_nullable as "is_nullable",
	data_type as "data_type",
	character_maximum_length as "char_max_length",
	numeric_precision as "numeric_precision",
	numeric_scale as "numeric_scale",
	column_default as "default_value"
from information_schema.columns
where 
		table_schema !~ '^_timescaledb_' 
		and (
			('tables:' || table_schema || '.' || table_name) =OBJECT_ID_CONDITION
			or
			('views:' || table_schema || '.' || table_name) =OBJECT_ID_CONDITION
		)
		and table_schema =SCHEMA_NAME_CONDITION
order by ordinal_position
`;