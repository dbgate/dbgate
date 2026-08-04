module.exports = `
SELECT
    TRIM(FA.RDB$FUNCTION_NAME) AS "owningObjectName",  -- Name of the function this parameter belongs to
    TRIM(FA.RDB$ARGUMENT_NAME) AS "parameterName",
    COALESCE(FFLDS.RDB$FIELD_TYPE, FA.RDB$FIELD_TYPE) AS "dataTypeCode",
    COALESCE(FFLDS.RDB$FIELD_SUB_TYPE, FA.RDB$FIELD_SUB_TYPE) AS "subType",
    COALESCE(FFLDS.RDB$FIELD_PRECISION, FA.RDB$FIELD_PRECISION) AS "precision",
    COALESCE(FFLDS.RDB$FIELD_SCALE, FA.RDB$FIELD_SCALE) AS "scale",
    COALESCE(FFLDS.RDB$FIELD_LENGTH, FA.RDB$FIELD_LENGTH) AS "length",
    FA.RDB$MECHANISM AS "mechanism",

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
LEFT JOIN
    RDB$FIELDS FFLDS ON FA.RDB$FIELD_SOURCE = FFLDS.RDB$FIELD_NAME
WHERE
    COALESCE(F.RDB$SYSTEM_FLAG, 0) = 0 -- Filter for user-defined functions
ORDER BY
    "owningObjectName", "position";
`;
