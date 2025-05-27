module.exports = `
SELECT
    TRIM(rc_fk.RDB$RELATION_NAME) AS "pureName",
    TRIM(rc_fk.RDB$CONSTRAINT_NAME) AS "constraintName",
    TRIM(iseg_fk.RDB$FIELD_NAME) AS "columnName",
    TRIM(iseg_pk.RDB$FIELD_NAME) AS "refColumnName",
    TRIM(rc_pk.RDB$RELATION_NAME) AS "refTableName",
    FALSE AS "isIncludedColumn",
    CASE COALESCE(idx_fk.RDB$INDEX_TYPE, 0)
        WHEN 1 THEN TRUE  -- For the FK's own index, 1 = Descending (modern Firebird)
        ELSE FALSE        -- 0 or NULL = Ascending for the FK's own index
    END AS "isDescending"   -- Refers to the sort order of the index on the FK column(s)
FROM
    RDB$RELATION_CONSTRAINTS rc_fk
JOIN
    RDB$RELATIONS rel ON rc_fk.RDB$RELATION_NAME = rel.RDB$RELATION_NAME
JOIN
    RDB$INDEX_SEGMENTS iseg_fk ON rc_fk.RDB$INDEX_NAME = iseg_fk.RDB$INDEX_NAME
JOIN
    RDB$INDICES idx_fk ON rc_fk.RDB$INDEX_NAME = idx_fk.RDB$INDEX_NAME
JOIN
    RDB$REF_CONSTRAINTS refc ON rc_fk.RDB$CONSTRAINT_NAME = refc.RDB$CONSTRAINT_NAME
JOIN
    RDB$RELATION_CONSTRAINTS rc_pk ON refc.RDB$CONST_NAME_UQ = rc_pk.RDB$CONSTRAINT_NAME
JOIN
    RDB$INDEX_SEGMENTS iseg_pk ON rc_pk.RDB$INDEX_NAME = iseg_pk.RDB$INDEX_NAME
                               AND iseg_fk.RDB$FIELD_POSITION = iseg_pk.RDB$FIELD_POSITION -- Critical for matching columns in composite keys
WHERE
    rc_fk.RDB$CONSTRAINT_TYPE = 'FOREIGN KEY'
AND
    ('tables:' || TRIM(rc_fk.RDB$RELATION_NAME)) =OBJECT_ID_CONDITION
ORDER BY
    "pureName",
    "constraintName",
    iseg_fk.RDB$FIELD_POSITION;
`;
