module.exports = `
SELECT 
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
    r.ROUTINE_TYPE AS routineType -- Function or Procedure
FROM 
    information_schema.PARAMETERS p
JOIN 
    information_schema.ROUTINES r
ON 
    p.SPECIFIC_NAME = r.SPECIFIC_NAME
WHERE 
    r.ROUTINE_SCHEMA = '#DATABASE#' AND r.ROUTINE_NAME =OBJECT_ID_CONDITION
`;
