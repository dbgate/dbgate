module.exports = `
SELECT
    n.nspname AS "schema_name",
    p.proname AS "pure_name",
    CASE p.prokind WHEN 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END AS "routine_type",
    a.parameter_name AS "parameter_name",
    CASE (p.proargmodes::text[])[a.ordinal_position]
        WHEN 'o' THEN 'OUT'
        WHEN 'b' THEN 'INOUT'
        WHEN 'v' THEN 'VARIADIC'
        WHEN 't' THEN 'TABLE'
        ELSE 'IN'
    END AS "parameter_mode",
    pg_catalog.format_type(a.parameter_type, NULL) AS "data_type",
    a.ordinal_position AS "parameter_index"
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL unnest(
    COALESCE(p.proallargtypes, p.proargtypes::oid[]),
    p.proargnames
) WITH ORDINALITY AS a(parameter_type, parameter_name, ordinal_position)
WHERE p.prokind IN ('f', 'p')
    AND p.proargnames IS NOT NULL
    AND a.parameter_name IS NOT NULL
    AND n.nspname !~ '^_timescaledb_'
    AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND n.nspname =SCHEMA_NAME_CONDITION
    AND (
        (p.prokind = 'p' AND ('procedures:' || n.nspname || '.' || p.proname) =OBJECT_ID_CONDITION)
        OR
        (p.prokind != 'p' AND ('functions:' || n.nspname || '.' || p.proname) =OBJECT_ID_CONDITION)
    )
ORDER BY n.nspname, a.ordinal_position
`;
