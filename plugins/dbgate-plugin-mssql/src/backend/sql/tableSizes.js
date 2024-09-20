module.exports = `
SELECT distinct
    t.object_id as objectId,
    p.rows AS tableRowCount
FROM 
    sys.tables t
INNER JOIN      
    sys.indexes i ON t.OBJECT_ID = i.object_id
INNER JOIN 
    sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
INNER JOIN
    sys.schemas s ON t.schema_id = s.schema_id
WHERE 
    t.NAME NOT LIKE 'dt%' 
    AND t.is_ms_shipped = 0
    AND i.OBJECT_ID > 255 
    AND s.name =SCHEMA_NAME_CONDITION
`;
