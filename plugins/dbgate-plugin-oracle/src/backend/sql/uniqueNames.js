module.exports = `
select constraint_name
from all_constraints
where OWNER='$owner' and constraint_type = 'U'
  and constraint_name =OBJECT_ID_CONDITION
`;
