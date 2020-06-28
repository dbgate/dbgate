module.exports = `
select 
	TABLE_NAME as pureName, 
    VIEW_DEFINITION as createSql
from information_schema.views 
where TABLE_SCHEMA = '#DATABASE#' and TABLE_NAME =[OBJECT_NAME_CONDITION];
`;
