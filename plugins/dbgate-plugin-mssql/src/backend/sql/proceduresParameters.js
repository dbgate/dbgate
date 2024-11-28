module.exports = `
SELECT 
    o.object_id as parentObjectId,
    p.object_id as objectId,
    o.name as pureName,
    p.name AS parameterName,
    TYPE_NAME(p.user_type_id) AS dataType,
    p.max_length AS charMaxLength,
    p.precision AS precision,
    p.scale AS scale,
    CASE 
        WHEN p.is_output = 1 THEN 'OUT'
        ELSE 'IN'
    END AS parameterMode,
    p.parameter_id AS parameterIndex,
    s.name as schemaName
FROM 
    sys.objects o
JOIN 
    sys.parameters p ON o.object_id = p.object_id
INNER JOIN
    sys.schemas s ON s.schema_id=o.schema_id 
WHERE 
    o.type = 'P'
    and o.object_id =OBJECT_ID_CONDITION and s.name =SCHEMA_NAME_CONDITION
ORDER BY 
    o.object_id,
    p.parameter_id;
`;
