module.exports = `
select 
	base.table_name as "table_name",
	base.table_schema as "table_schema",
	base.constraint_name as "constraint_name",
	base.constraint_schema as "constraint_schema"
from information_schema.table_constraints base
where ('tables:' || base.table_schema || '.' || base.table_name) =OBJECT_ID_CONDITION
`;
