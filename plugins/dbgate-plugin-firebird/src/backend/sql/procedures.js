module.exports = `
SELECT
    TRIM(P.RDB$PROCEDURE_NAME) AS "pureName",
    TRIM('PROCEDURE') AS "objectTypeField",
    TRIM(P.RDB$DESCRIPTION) AS "objectComment",
    CAST(SUBSTRING(P.RDB$PROCEDURE_SOURCE FROM 1 FOR 5000) AS VARCHAR(5000)) AS "createSql",
    0 AS "requiresFormat"
FROM
    RDB$PROCEDURES P
WHERE
    COALESCE(P.RDB$SYSTEM_FLAG, 0) = 0          -- Filter for user-defined procedures
    AND ('procedures:' || TRIM(P.RDB$PROCEDURE_NAME)) =OBJECT_ID_CONDITION
ORDER BY
    "pureName";
`;
