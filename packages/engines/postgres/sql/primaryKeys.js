module.exports = `
select 
	table_constraints.constraint_schema as "constraintSchema",
	table_constraints.constraint_name as "constraintName",
	table_constraints.table_schema as "schemaName",
	table_constraints.table_name as "pureName",
	key_column_usage.column_name as "columnName"
from information_schema.table_constraints
inner join information_schema.key_column_usage on table_constraints.table_name = key_column_usage.table_name and table_constraints.constraint_name = key_column_usage.constraint_name
where 
		table_constraints.table_schema <> 'information_schema' 
		and table_constraints.table_schema <> 'pg_catalog' 
		and table_constraints.table_schema !~ '^pg_toast' 
		and table_constraints.constraint_type = 'PRIMARY KEY'
		and 'table:' || table_constraints.table_schema || '.' || table_constraints.table_name =[OBJECT_ID_CONDITION]
order by key_column_usage.ordinal_position
`;
