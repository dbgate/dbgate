module.exports = `
select 
    ROUTINE_NAME as pureName,
    ROUTINE_TYPE as objectType,
    ROUTINE_DEFINITION as createSql
from information_schema.routines
where ROUTINE_SCHEMA = '#DATABASE#'
`;
