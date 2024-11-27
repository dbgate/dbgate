module.exports = `
SELECT 
    proc.specific_schema AS specific_schema,
    proc.routine_name AS routine_name,
    proc.routine_type as routine_type,
    args.parameter_name AS pure_name,
    args.parameter_mode,
    args.data_type AS data_type,
    args.ordinal_position AS parameter_index,
    CASE 
        WHEN args.parameter_mode IN ('OUT', 'INOUT') THEN TRUE
        ELSE FALSE
    END AS is_output_paramter
FROM 
    information_schema.routines proc
LEFT JOIN 
    information_schema.parameters args
    ON proc.specific_schema = args.specific_schema
    AND proc.specific_name = args.specific_name
WHERE 
    proc.routine_schema NOT IN ('pg_catalog', 'information_schema') -- Exclude system schemas
    AND proc.routine_type IN ('PROCEDURE', 'FUNCTION') -- Filter for procedures
ORDER BY 
    specific_schema,
    routine_name,
    args.ordinal_position;
`;
