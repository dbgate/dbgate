module.exports = `
select constraint_name
from all_constraints
where constraint_type = 'U'
  and constraint_name =OBJECT_ID_CONDITION
`;
