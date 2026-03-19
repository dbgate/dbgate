module.exports = `
SELECT
    n.nspname AS "schema_name",
    c.relname AS "pure_name",
    pg_relation_size(c.oid) AS "size_bytes"
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'f')
    AND ('tables:' || n.nspname || '.' || c.relname) =OBJECT_ID_CONDITION
    AND n.nspname <> 'pg_internal'
    AND n.nspname !~ '^_timescaledb_'
    AND n.nspname =SCHEMA_NAME_CONDITION
`;
