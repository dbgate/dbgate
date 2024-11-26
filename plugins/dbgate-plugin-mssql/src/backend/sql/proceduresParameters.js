module.exports = `
SELECT 
    o.object_id as parentObjectId,
    p.object_id as objectId,
    p.name AS pureName,
    TYPE_NAME(p.user_type_id) AS dataType,
    p.max_length AS charMaxLength,
    p.precision AS precision,
    p.scale AS scale,
    p.is_output AS isOutputParameter,
    p.parameter_id AS parameterIndex
FROM 
    sys.objects o
JOIN 
    sys.parameters p ON o.object_id = p.object_id
WHERE 
    o.type = 'P'
ORDER BY 
    o.object_id,
    p.parameter_id;
`;
