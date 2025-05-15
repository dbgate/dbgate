module.exports = `
SELECT
    TRIM(RDB$RELATION_NAME) AS "pureName",
    RDB$DESCRIPTION AS "objectComment",
    RDB$FORMAT AS "objectTypeField"
FROM RDB$RELATIONS
WHERE RDB$SYSTEM_FLAG = 0 -- only user-defined tables
ORDER BY "pureName";
`;
