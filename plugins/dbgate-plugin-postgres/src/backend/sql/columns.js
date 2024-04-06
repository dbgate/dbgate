module.exports = `
select 
	table_schema as "schema_name", 
	table_name as "pure_name", 
	column_name as "column_name",
	is_nullable as "is_nullable",
    case
			when (data_type = 'USER-DEFINED' OR data_type = 'ARRAY') then udt_name::regtype::text
      else data_type
     end
	as "data_type",
	character_maximum_length as "char_max_length",
	numeric_precision as "numeric_precision",
	numeric_scale as "numeric_scale",
	column_default as "default_value"
from information_schema.columns
where 
		table_schema <> 'information_schema' 
		and table_schema <> 'pg_catalog' 
		and table_schema !~ '^pg_toast' 
		and (
			('tables:' || table_schema || '.' || table_name) =OBJECT_ID_CONDITION
			or
			('views:' || table_schema || '.' || table_name) =OBJECT_ID_CONDITION
		)
order by ordinal_position
`;