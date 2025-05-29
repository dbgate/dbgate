module.exports = `
SELECT       -- Index name, maps to pureName
    TRIM(I.RDB$INDEX_NAME) AS "constraintName",       -- Index name, maps to constraintName
    TRIM('index') AS "constraintType",                -- ConstraintType for IndexInfo
    TRIM(I.RDB$RELATION_NAME) AS "pureName",            -- Context: Table the index is on
    CASE COALESCE(I.RDB$UNIQUE_FLAG, 0)             -- isUnique: 1 for unique, 0 or NULL for non-unique [cite: 46, 838]
        WHEN 1 THEN TRUE
        ELSE FALSE
    END AS "isUnique",
    CASE
        WHEN I.RDB$EXPRESSION_SOURCE IS NOT NULL THEN TRIM('expression') -- indexType: if an expression index [cite: 46, 262]
        ELSE TRIM('normal')
    END AS "indexType",
    I.RDB$CONDITION_SOURCE AS "idx_filterDefinition", -- filterDefinition: for partial indexes [cite: 46, 261, 838]
    COALESCE(I.RDB$INDEX_INACTIVE, 0) AS "idx_isInactive", -- 0 for active, 1 for inactive [cite: 46, 838]
    I.RDB$DESCRIPTION AS "idx_description",           -- Index description/comment [cite: 46, 838]

    -- Column specific fields from RDB$INDEX_SEGMENTS
    TRIM(S.RDB$FIELD_NAME) AS "columnName",           -- columnName for ColumnReference [cite: 46, 837]
    CASE COALESCE(I.RDB$INDEX_TYPE, 0)              -- isDescending: 0 for ASC (default), 1 for DESC for the whole index [cite: 46, 838]
        WHEN 1 THEN TRUE
        ELSE FALSE
    END AS "isDescending",
    S.RDB$FIELD_POSITION AS "col_fieldPosition"     -- 0-based position of the column in the index [cite: 46, 837]
FROM
    RDB$INDICES I
JOIN
    RDB$INDEX_SEGMENTS S ON I.RDB$INDEX_NAME = S.RDB$INDEX_NAME
WHERE
    COALESCE(I.RDB$SYSTEM_FLAG, 0) = 0          -- Filter for user-defined indexes [cite: 46, 838]
    AND I.RDB$FOREIGN_KEY IS NULL               -- Exclude indexes backing foreign keys [cite: 46, 838]
                                                -- (RDB$FOREIGN_KEY is not null if the index is for an FK)
    AND NOT EXISTS (                            -- Exclude indexes that are the chosen supporting index for a PK or UQ constraint
        SELECT 1
        FROM RDB$RELATION_CONSTRAINTS rc
        WHERE rc.RDB$INDEX_NAME = I.RDB$INDEX_NAME
          AND rc.RDB$CONSTRAINT_TYPE IN ('PRIMARY KEY', 'UNIQUE')
    )

    AND
        ('tables:' || TRIM(i.RDB$RELATION_NAME)) =OBJECT_ID_CONDITION
`;
