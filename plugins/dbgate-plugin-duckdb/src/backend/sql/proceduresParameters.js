module.exports = `
SELECT 
    proc.specific_schema AS schema_name,
    proc.routine_name AS pure_name,
    proc.routine_type as routine_type,
    args.parameter_name AS parameter_name,
    args.parameter_mode,
    args.data_type AS data_type,
    args.ordinal_position AS parameter_index,
    args.parameter_mode AS parameter_mode
FROM 
    information_schema.routines proc 
LEFT JOIN 
    information_schema.parameters args
    ON proc.specific_schema = args.specific_schema
    AND proc.specific_name = args.specific_name
WHERE 
    proc.specific_schema NOT IN ('pg_catalog', 'information_schema') -- Exclude system schemas
    AND args.parameter_name IS NOT NULL
    AND proc.routine_type IN ('PROCEDURE', 'FUNCTION') -- Filter for procedures
    AND proc.specific_schema !~ '^_timescaledb_' 
    AND proc.specific_schema =SCHEMA_NAME_CONDITION
    AND (
      (routine_type = 'PROCEDURE' AND ('procedures:' || proc.specific_schema || '.' ||  routine_name) =OBJECT_ID_CONDITION)
      OR
      (routine_type = 'FUNCTION' AND ('functions:' || proc.specific_schema || '.' ||  routine_name) =OBJECT_ID_CONDITION)
    )
ORDER BY 
    schema_name,
    args.ordinal_position;
`;
