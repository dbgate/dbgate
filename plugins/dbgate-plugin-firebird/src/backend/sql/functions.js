module.exports = `
SELECT
    TRIM(F.RDB$FUNCTION_NAME) AS "pureName",
    TRIM(F.RDB$FUNCTION_NAME) AS "objectId",
    TRIM('FUNCTION') AS "objectTypeField",
    TRIM(F.RDB$DESCRIPTION) AS "objectComment",
    F.RDB$FUNCTION_SOURCE AS "createSql", -- This is the PSQL body or definition for UDRs
    FALSE AS "requiresFormat" -- Assuming PSQL source is generally readable
FROM
    RDB$FUNCTIONS F
WHERE
    COALESCE(F.RDB$SYSTEM_FLAG, 0) = 0 -- User-defined functions 
    AND ('funcitons:' || TRIM(F.RDB$FUNCTION_NAME)) =OBJECT_ID_CONDITION
ORDER BY
    "pureName";
`;
