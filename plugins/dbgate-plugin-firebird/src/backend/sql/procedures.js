module.exports = `
SELECT
    TRIM(P.RDB$PROCEDURE_NAME) AS "pureName",
    TRIM('PROCEDURE') AS "objectTypeField",
    TRIM(P.RDB$DESCRIPTION) AS "objectComment",
    P.RDB$PROCEDURE_SOURCE AS "createSql",       -- Contains the PSQL body
    FALSE AS "requiresFormat"
FROM
    RDB$PROCEDURES P
WHERE
    COALESCE(P.RDB$SYSTEM_FLAG, 0) = 0          -- Filter for user-defined procedures
    AND P.RDB$PROCEDURE_TYPE IS NOT NULL        -- Ensure it's a valid procedure type (0, 1, or 2)
    AND ('procedures:' || TRIM(P.RDB$PROCEDURE_NAME)) =OBJECT_ID_CONDITION
ORDER BY
    "pureName";
`;
