module.exports = `
select constraint_name as "constraintName"
from all_constraints
where owner='$owner' and constraint_type = 'U'
  and constraint_name =OBJECT_ID_CONDITION
`;
