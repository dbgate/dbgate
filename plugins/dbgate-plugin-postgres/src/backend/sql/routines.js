module.exports = `
SELECT
    p.proname AS "pure_name",
    n.nspname AS "schema_name",
    max(p.prosrc) AS "definition",
    max($md5Function(p.prosrc)) AS "hash_code",
    CASE max(p.prokind) WHEN 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END AS "object_type",
    $typeAggFunc(pg_catalog.format_type(p.prorettype, NULL) $typeAggParam) AS "data_type",
    max(l.lanname) AS "language"
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
JOIN pg_catalog.pg_language l ON l.oid = p.prolang
WHERE p.prokind IN ('f', 'p')
    AND n.nspname !~ '^_timescaledb_'
    AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND n.nspname =SCHEMA_NAME_CONDITION
    AND (
        (p.prokind = 'p' AND ('procedures:' || n.nspname || '.' || p.proname) =OBJECT_ID_CONDITION)
        OR
        (p.prokind != 'p' AND ('functions:' || n.nspname || '.' || p.proname) =OBJECT_ID_CONDITION)
    )
GROUP BY p.proname, n.nspname, p.prokind
`;
