module.exports = `
    SELECT 
        INDEX_NAME AS constraintName,
        TABLE_NAME AS tableName,
        COLUMN_NAME AS columnName,
        INDEX_TYPE AS indexType,
        NON_UNIQUE AS nonUnique,
        CASE COLLATION
            WHEN 'D' THEN 1
            ELSE 0
        END AS isDescending
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = '#DATABASE#' AND TABLE_NAME =OBJECT_ID_CONDITION AND INDEX_NAME != 'PRIMARY'
    ORDER BY SEQ_IN_INDEX
`;
