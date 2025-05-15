module.exports = `
SELECT
    TRIM(FA.RDB$FUNCTION_NAME) AS "owningObjectName",  -- Name of the function this parameter belongs to
    TRIM(FA.RDB$ARGUMENT_NAME) AS "parameterName",
    FFLDS.RDB$FIELD_TYPE AS "dataTypeCode",                  -- SQL data type code from RDB$FIELDS
    FFLDS.rdb$field_precision AS "precision",
    FFLDS.rdb$field_scale AS "scale",
    FFLDS.rdb$field_length AS "length",

    TRIM(CASE
        WHEN FA.RDB$ARGUMENT_POSITION = F.RDB$RETURN_ARGUMENT THEN 'RETURN'
        ELSE 'IN' -- For PSQL functions, non-return arguments are IN.
    END) AS "parameterMode",
    FA.RDB$ARGUMENT_POSITION AS "position", -- 0-based index for arguments

    -- Fields for ParameterInfo.NamedObjectInfo
    TRIM(FA.RDB$FUNCTION_NAME) AS "pureName" -- NamedObjectInfo.pureName for the parameter

FROM
    RDB$FUNCTION_ARGUMENTS FA
JOIN
    RDB$FUNCTIONS F ON FA.RDB$FUNCTION_NAME = F.RDB$FUNCTION_NAME
JOIN
    RDB$FIELDS FFLDS ON FA.RDB$FIELD_SOURCE = FFLDS.RDB$FIELD_NAME -- Crucial join to get RDB$FIELDS.RDB$TYPE
WHERE
    COALESCE(F.RDB$SYSTEM_FLAG, 0) = 0 -- Filter for user-defined functions
ORDER BY
    "owningObjectName", "position";
`;
