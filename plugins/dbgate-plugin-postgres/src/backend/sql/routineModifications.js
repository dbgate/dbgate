module.exports = `
SELECT
    p.proname AS "pure_name",
    n.nspname AS "schema_name",
    $md5Function(p.prosrc) AS "hash_code",
    CASE p.prokind WHEN 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END AS "object_type"
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind IN ('f', 'p')
    AND n.nspname !~ '^_timescaledb_'
    AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND n.nspname =SCHEMA_NAME_CONDITION
`;
