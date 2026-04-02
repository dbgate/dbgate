module.exports = `
SELECT
    n.nspname AS "schema_name",
    c.relname AS "pure_name",
    $md5Function(
        COALESCE(
            (SELECT string_agg(
                a.attname || ':' || pg_catalog.format_type(a.atttypid, a.atttypmod) || ':' || a.attnotnull::text,
                ',' ORDER BY a.attnum
            )
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped),
            ''
        )
    ) AS "hash_code_columns",
    $md5Function(
        COALESCE(
            (SELECT string_agg(
                con.conname || ':' || con.contype::text,
                ',' ORDER BY con.conname
            )
            FROM pg_catalog.pg_constraint con
            WHERE con.conrelid = c.oid),
            ''
        )
    ) AS "hash_code_constraints"
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'f')
    AND n.nspname <> 'pg_internal'
    AND n.nspname !~ '^_timescaledb_'
    AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    AND n.nspname =SCHEMA_NAME_CONDITION
`;
