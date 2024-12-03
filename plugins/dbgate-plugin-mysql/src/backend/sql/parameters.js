module.exports = `
SELECT
    r.ROUTINE_SCHEMA AS schemaName,
    r.SPECIFIC_NAME AS pureName,
    CASE 
        WHEN COALESCE(NULLIF(PARAMETER_MODE, ''), 'RETURN') = 'RETURN' THEN 'Return'
        ELSE PARAMETER_NAME
    END AS parameterName,
    p.CHARACTER_MAXIMUM_LENGTH AS charMaxLength,
    p.NUMERIC_PRECISION AS numericPrecision,
    p.NUMERIC_SCALE AS numericScale,
    p.DTD_IDENTIFIER AS dataType,
    COALESCE(NULLIF(PARAMETER_MODE, ''), 'RETURN') AS parameterMode,
    r.ROUTINE_TYPE AS routineType, -- Function or Procedure
    p.ORDINAL_POSITION AS ordinalPosition
FROM 
    information_schema.PARAMETERS p
JOIN 
    information_schema.ROUTINES r
ON 
    p.SPECIFIC_NAME = r.SPECIFIC_NAME AND r.ROUTINE_SCHEMA = p.SPECIFIC_SCHEMA
WHERE 
    r.ROUTINE_SCHEMA = '#DATABASE#' AND r.ROUTINE_NAME =OBJECT_ID_CONDITION
ORDER BY
    r.ROUTINE_SCHEMA, r.SPECIFIC_NAME, p.ORDINAL_POSITION
`;
