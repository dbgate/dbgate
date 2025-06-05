module.exports = `
SELECT DISTINCT
    CAST(TRIM(rf.rdb$relation_name) AS VARCHAR(255)) AS "tableName",
    CAST(TRIM(rf.rdb$field_name) AS VARCHAR(255)) AS "columnName",
    CASE rf.rdb$null_flag WHEN 1 THEN TRUE ELSE FALSE END AS "notNull",
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM rdb$relation_constraints rc
            JOIN rdb$index_segments idx ON rc.rdb$index_name = idx.rdb$index_name
            WHERE rc.rdb$relation_name = rf.rdb$relation_name
              AND idx.rdb$field_name = rf.rdb$field_name
              AND rc.rdb$constraint_type = 'PRIMARY KEY'
        ) THEN TRUE
        ELSE FALSE
    END AS "isPrimaryKey",
    f.rdb$field_type AS "dataTypeCode",
    f.rdb$field_precision AS "precision",
    f.rdb$field_scale AS "scale",
    f.rdb$field_length / 4 AS "length",
    CAST(TRIM(rf.RDB$DEFAULT_SOURCE) AS VARCHAR(255)) AS "defaultValue",
    CAST(TRIM(rf.rdb$description) AS VARCHAR(255)) AS "columnComment",
    CASE
        WHEN f.rdb$field_type IN (8, 9, 16) AND f.rdb$field_scale < 0 THEN TRUE
        ELSE FALSE
    END AS "isUnsigned",
    CAST(TRIM(rf.rdb$relation_name) AS VARCHAR(255)) AS "pureName"
FROM
    rdb$relation_fields rf
JOIN
    rdb$relations r ON rf.rdb$relation_name = r.rdb$relation_name
LEFT JOIN
    rdb$fields f ON rf.rdb$field_source = f.rdb$field_name
LEFT JOIN
    rdb$character_sets cs ON f.rdb$character_set_id = cs.rdb$character_set_id
LEFT JOIN
    rdb$collations co ON f.rdb$collation_id = co.rdb$collation_id
WHERE
    r.rdb$system_flag = 0
AND
    ('tables:' || CAST(TRIM(rf.rdb$relation_name) AS VARCHAR(255))) =OBJECT_ID_CONDITION
ORDER BY
    "tableName", rf.rdb$field_position;
`;
