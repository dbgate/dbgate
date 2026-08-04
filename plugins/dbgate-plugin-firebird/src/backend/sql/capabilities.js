module.exports = `
SELECT
    (
        SELECT COUNT(*)
        FROM RDB$RELATION_FIELDS
        WHERE RDB$RELATION_NAME = 'RDB$FUNCTIONS'
          AND RDB$FIELD_NAME = 'RDB$FUNCTION_SOURCE'
    ) AS "functionSourceCount",
    (
        SELECT COUNT(*)
        FROM RDB$RELATION_FIELDS
        WHERE RDB$RELATION_NAME = 'RDB$FUNCTION_ARGUMENTS'
          AND RDB$FIELD_NAME = 'RDB$FIELD_SOURCE'
    ) AS "functionArgumentSourceCount"
FROM RDB$DATABASE;
`;
