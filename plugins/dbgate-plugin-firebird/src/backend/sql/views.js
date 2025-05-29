module.exports = `SELECT
    TRIM(RDB$RELATION_NAME) AS "pureName",
    RDB$DESCRIPTION AS "objectComment",
    RDB$FORMAT AS "objectTypeField"
FROM
    RDB$RELATIONS
WHERE
    RDB$SYSTEM_FLAG = 0 -- only user-defined tables
AND
    RDB$RELATION_TYPE = 1 -- only views (not tables, etc.)
AND
    ('tables:' || TRIM(RDB$RELATION_NAME)) =OBJECT_ID_CONDITION
ORDER BY
    "pureName";`;
