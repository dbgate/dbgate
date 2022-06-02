module.exports = `
select 
	fk.constraint_name as "constraint_name",
	fk.constraint_schema as "constraint_schema",
	fk.update_rule as "update_action",
	fk.delete_rule as "delete_action",
    fk.unique_constraint_name as "unique_constraint_name",
    fk.unique_constraint_schema as "unique_constraint_schema" 
from information_schema.referential_constraints fk
`;
