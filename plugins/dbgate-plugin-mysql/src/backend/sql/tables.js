module.exports = `
select 
	TABLE_NAME as pureName, 
	case when ENGINE='InnoDB' then CREATE_TIME else coalesce(UPDATE_TIME, CREATE_TIME) end as modifyDate 
from information_schema.tables 
where TABLE_SCHEMA = '#DATABASE#' and TABLE_TYPE='BASE TABLE' and TABLE_NAME =OBJECT_ID_CONDITION;
`;
