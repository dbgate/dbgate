module.exports = `
SELECT
    TRIM(F.RDB$FUNCTION_NAME) AS "pureName",
    TRIM(F.RDB$FUNCTION_NAME) AS "objectId",
    TRIM('FUNCTION') AS "objectTypeField",
    TRIM(F.RDB$DESCRIPTION) AS "objectComment",
    TRIM(F.RDB$ENTRYPOINT) AS "entryPoint",
    TRIM(F.RDB$MODULE_NAME) AS "moduleName",
    CAST(NULL AS VARCHAR(5000)) AS "createSql",
    0 AS "requiresFormat"
FROM
    RDB$FUNCTIONS F
WHERE
    COALESCE(F.RDB$SYSTEM_FLAG, 0) = 0
    AND ('functions:' || TRIM(F.RDB$FUNCTION_NAME)) =OBJECT_ID_CONDITION
ORDER BY
    "pureName";
`;
