module.exports = `
select 
	fk.constraint_name as "constraint_name",
	fk.constraint_schema as "constraint_schema",
	base.table_name as "pure_name",
	base.table_schema as "schema_name",
	fk.update_rule as "update_action",
	fk.delete_rule as "delete_action",
	ref.table_name as "ref_table_name",
	ref.table_schema as "ref_schema_name",
	basecol.column_name as "column_name",
	refcol.column_name as "ref_column_name"
from information_schema.referential_constraints fk
inner join information_schema.table_constraints base on fk.constraint_name = base.constraint_name and fk.constraint_schema = base.constraint_schema
inner join information_schema.table_constraints ref on fk.unique_constraint_name = ref.constraint_name and fk.unique_constraint_schema = ref.constraint_schema #REFTABLECOND#
inner join information_schema.key_column_usage basecol on base.table_name = basecol.table_name and base.constraint_name = basecol.constraint_name
inner join information_schema.key_column_usage refcol on ref.table_name = refcol.table_name and ref.constraint_name = refcol.constraint_name and basecol.ordinal_position = refcol.ordinal_position
where 
		base.table_schema <> 'information_schema' 
		and base.table_schema <> 'pg_catalog' 
		and base.table_schema !~ '^pg_toast' 
		and ('tables:' || base.table_schema || '.' || base.table_name) =OBJECT_ID_CONDITION
order by basecol.ordinal_position
`;
