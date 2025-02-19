module.exports = `
select 
	table_constraints.constraint_schema as "constraint_schema",
	table_constraints.constraint_name as "constraint_name",
	table_constraints.table_schema as "schema_name",
	table_constraints.table_name as "pure_name",
	key_column_usage.column_name as "column_name"
from information_schema.table_constraints
inner join information_schema.key_column_usage on table_constraints.table_name = key_column_usage.table_name and table_constraints.constraint_name = key_column_usage.constraint_name
    and table_constraints.table_schema = key_column_usage.table_schema
where 
		table_constraints.table_schema !~ '^_timescaledb_' 
		and table_constraints.constraint_type = 'PRIMARY KEY'
		and ('tables:' || table_constraints.table_schema || '.' || table_constraints.table_name) =OBJECT_ID_CONDITION
		and table_constraints.table_schema =SCHEMA_NAME_CONDITION
order by key_column_usage.ordinal_position
`;
