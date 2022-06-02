module.exports = `
select 
	TABLE_NAME as pureName, 
    VIEW_DEFINITION as viewDefinition
from information_schema.views 
where TABLE_SCHEMA = '#DATABASE#' and TABLE_NAME =OBJECT_ID_CONDITION;
`;
