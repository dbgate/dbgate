module.exports = `
select 
	TABLE_NAME as pureName, 
    coalesce(UPDATE_TIME, CREATE_TIME) as modifyDate
from information_schema.tables 
where TABLE_SCHEMA = '#DATABASE#' and TABLE_NAME =OBJECT_ID_CONDITION and TABLE_TYPE = 'VIEW';
`;
