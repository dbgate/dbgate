module.exports = `
SELECT
    TRIM(rc.RDB$RELATION_NAME) AS "pureName",
    TRIM(rc.RDB$CONSTRAINT_NAME) AS "constraintName",
    TRIM(iseg.RDB$FIELD_NAME) AS "columnName",
    CAST(NULL AS VARCHAR(63)) AS "refColumnName",
    FALSE AS "isIncludedColumn",
    CASE COALESCE(idx.RDB$INDEX_TYPE, 0) -- Treat NULL as 0 (ascending)
        WHEN 1 THEN TRUE  -- Assuming 1 means DESCENDING for regular (non-expression) indexes
        ELSE FALSE        -- Assuming 0 (or NULL) means ASCENDING for regular indexes
    END AS "isDescending"
FROM
    RDB$RELATION_CONSTRAINTS rc
JOIN
    RDB$RELATIONS rel ON rc.RDB$RELATION_NAME = rel.RDB$RELATION_NAME
JOIN
    RDB$INDICES idx ON rc.RDB$INDEX_NAME = idx.RDB$INDEX_NAME
JOIN
    RDB$INDEX_SEGMENTS iseg ON idx.RDB$INDEX_NAME = iseg.RDB$INDEX_NAME
WHERE
    rc.RDB$CONSTRAINT_TYPE = 'PRIMARY KEY'
    AND COALESCE(rel.RDB$SYSTEM_FLAG, 0) = 0 -- Typically, you only want user-defined tables
    AND ('tables:' || TRIM(rc.RDB$RELATION_NAME)) =OBJECT_ID_CONDITION
ORDER BY
    "pureName",
    "constraintName",
    iseg.RDB$FIELD_POSITION;
`;
