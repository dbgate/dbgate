module.exports = `
select 
	f_table_schema as "schema_name", 
	f_table_name as "pure_name", 
	f_geography_column as "column_name"
from public.geography_columns
where ('tables:' || f_table_schema || '.' || f_table_name) =OBJECT_ID_CONDITION and f_table_schema =SCHEMA_NAME_CONDITION
`;