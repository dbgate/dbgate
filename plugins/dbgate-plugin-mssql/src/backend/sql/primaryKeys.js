module.exports = `
SELECT 
    i.object_id AS objectId,
    o.name AS pureName,
    s.name AS schemaName,
    c.name AS columnName,
    i.name AS constraintName
FROM 
    sys.indexes i
INNER JOIN 
    sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN 
    sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
INNER JOIN
    sys.objects o ON i.object_id = o.object_id
INNER JOIN
    sys.schemas s ON o.schema_id = s.schema_id
WHERE 
    i.is_primary_key = 1
	and o.object_id =OBJECT_ID_CONDITION
    and s.name =SCHEMA_NAME_CONDITION
ORDER BY 
    ic.key_ordinal
`;
