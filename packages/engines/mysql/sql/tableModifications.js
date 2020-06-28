module.exports = `
select 
	TABLE_NAME as pureName, 
	TABLE_TYPE as objectType,
	case when ENGINE='InnoDB' then CREATE_TIME else coalesce(UPDATE_TIME, CREATE_TIME) end as modifyDate 
from information_schema.tables 
where TABLE_SCHEMA = '#DATABASE#'
`;
