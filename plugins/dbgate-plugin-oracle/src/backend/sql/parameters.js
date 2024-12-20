module.exports = `
SELECT 
    o.OBJECT_NAME AS pure_name,
    PACKAGE_NAME,
    ARGUMENT_NAME AS parameter_name,
    POSITION AS ordinal_position,
    DATA_TYPE AS data_type,
    CHAR_LENGTH AS char_max_length,
    DATA_PRECISION AS numeric_precision,
    DATA_SCALE AS numeric_scale,
    IN_OUT AS parameter_mode
FROM 
    all_objects o
LEFT JOIN 
    all_arguments a
    ON o.object_id = a.object_id
WHERE 
    o.object_type IN ('FUNCTION', 'PROCEDURE')
    AND o.OWNER = '$owner'
ORDER BY 
    POSITION;
`;
