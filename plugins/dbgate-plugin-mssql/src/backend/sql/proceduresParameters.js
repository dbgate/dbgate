module.exports = `
SELECT 
    o.object_id as parentObjectId,
    p.object_id as objectId,
    o.name as pureName,
    p.name AS parameterName,
    TYPE_NAME(p.user_type_id) AS dataType,
    CASE 
        WHEN TYPE_NAME(p.user_type_id) = 'nvarchar' THEN p.max_length / 2
        ELSE p.max_length
    END AS charMaxLength,
    CASE 
        WHEN p.is_output = 1 THEN 'OUT'
        ELSE 'IN'
    END AS parameterMode,
    CASE
        WHEN TYPE_NAME(p.user_type_id) IN ('numeric', 'decimal') THEN p.precision
        ELSE NULL
    END AS numericPrecision,
    CASE
        WHEN TYPE_NAME(p.user_type_id) IN ('numeric', 'decimal') THEN p.scale
        ELSE NULL
    END AS numericScale,
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