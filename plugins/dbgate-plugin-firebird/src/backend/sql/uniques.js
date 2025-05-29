module.exports = `
SELECT
    TRIM(rc.RDB$CONSTRAINT_NAME) AS "constraintName",  -- Name of the constraint
    TRIM('unique') AS "constraintType",                -- Type of the constraint
    TRIM(rc.RDB$RELATION_NAME) AS "pureName",           -- Context: Table the constraint is on

    -- Column specific fields from RDB$INDEX_SEGMENTS for the backing index
    TRIM(s.RDB$FIELD_NAME) AS "columnName",           -- Name of the column in the unique key
    CASE COALESCE(i.RDB$INDEX_TYPE, 0)              -- isDescending: 0 for ASC (default), 1 for DESC for the backing index
        WHEN 1 THEN TRUE
        ELSE FALSE
    END AS "isDescending"
FROM
    RDB$RELATION_CONSTRAINTS rc
JOIN
    -- RDB$INDEX_NAME in RDB$RELATION_CONSTRAINTS is the name of the index that enforces the UNIQUE constraint
    RDB$INDICES i ON rc.RDB$INDEX_NAME = i.RDB$INDEX_NAME
JOIN
    RDB$INDEX_SEGMENTS s ON i.RDB$INDEX_NAME = s.RDB$INDEX_NAME
WHERE
    rc.RDB$CONSTRAINT_TYPE = 'UNIQUE'             -- Filter for UNIQUE constraints
    AND COALESCE(i.RDB$SYSTEM_FLAG, 0) = 0      -- Typically, backing indexes for user UQ constraints are user-related.
    AND
        ('tables:' || TRIM(rc.RDB$RELATION_NAME)) =OBJECT_ID_CONDITION
`;
