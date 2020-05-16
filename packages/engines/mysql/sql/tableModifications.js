module.exports = `
select 
	TABLE_NAME, 
	case when ENGINE='InnoDB' then CREATE_TIME else coalesce(UPDATE_TIME, CREATE_TIME) end as ALTER_TIME 
from information_schema.tables 
where TABLE_SCHEMA = '#DATABASE#'
`;
