module.exports = `
select 
    ROUTINE_NAME as pureName,
    ROUTINE_TYPE as objectType,
    COALESCE(LAST_ALTERED, CREATED) as modifyDate,
    DATA_TYPE AS returnDataType,
    ROUTINE_DEFINITION as routineDefinition,
    IS_DETERMINISTIC as isDeterministic
from information_schema.routines
where ROUTINE_SCHEMA = '#DATABASE#' and ROUTINE_NAME =OBJECT_ID_CONDITION
`;
