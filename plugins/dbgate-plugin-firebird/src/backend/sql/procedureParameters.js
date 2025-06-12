module.exports = `
SELECT
    TRIM(PP.RDB$PROCEDURE_NAME) AS "owningObjectName",  -- Name of the procedure this parameter belongs to
    TRIM(PP.RDB$PARAMETER_NAME) AS "parameterName",      -- ParameterInfo.parameterName
    FFLDS.RDB$FIELD_TYPE AS "dataTypeCode",                  -- SQL data type code from RDB$FIELDS
    FFLDS.rdb$field_precision AS "precision",
    FFLDS.rdb$field_scale AS "scale",
    FFLDS.rdb$field_length AS "length",

    CASE PP.RDB$PARAMETER_TYPE
        WHEN 0 THEN 'IN'
        WHEN 1 THEN 'OUT'
        ELSE CAST(PP.RDB$PARAMETER_TYPE AS VARCHAR(10)) -- Should ideally not happen for valid params
    END AS "parameterMode",
    PP.RDB$PARAMETER_NUMBER AS "position", -- 0-based for IN params, then 0-based for OUT params

    -- Fields for ParameterInfo.NamedObjectInfo
    TRIM(PP.RDB$PARAMETER_NAME) AS "pureName" -- NamedObjectInfo.pureName for the parameter

FROM
    RDB$PROCEDURE_PARAMETERS PP
JOIN
    RDB$PROCEDURES P ON PP.RDB$PROCEDURE_NAME = P.RDB$PROCEDURE_NAME
JOIN
    RDB$FIELDS FFLDS ON PP.RDB$FIELD_SOURCE = FFLDS.RDB$FIELD_NAME -- Links parameter to its base field type
WHERE
    COALESCE(P.RDB$SYSTEM_FLAG, 0) = 0 -- Filter for user-defined procedures
ORDER BY
    "owningObjectName", PP.RDB$PARAMETER_TYPE, "position"; -- Order by IN(0)/OUT(1) then by position
`;
