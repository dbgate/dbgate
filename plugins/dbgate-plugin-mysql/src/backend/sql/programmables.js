module.exports = `
select 
    ROUTINE_NAME as pureName,
    ROUTINE_TYPE as objectType,
    COALESCE(LAST_ALTERED, CREATED) as modifyDate,
    ROUTINE_DEFINITION as createSql
from information_schema.routines
where ROUTINE_SCHEMA = '#DATABASE#' and ROUTINE_NAME =[OBJECT_ID_CONDITION]
`;
