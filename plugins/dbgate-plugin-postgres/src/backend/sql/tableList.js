module.exports = `
SELECT
    n.nspname AS "schema_name",
    c.relname AS "pure_name",
    pg_relation_size(c.oid) AS "size_bytes",
    $md5Function(
        COALESCE(
            (SELECT $typeAggFunc(
                a.attname || ':' || pg_catalog.format_type(a.atttypid, a.atttypmod) || ':' || a.attnotnull::text
                $hashColumnAggTail
            )
            FROM pg_catalog.pg_attribute a
            WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped),
            ''
        )
    ) AS "hash_code_columns",
    $md5Function(
        COALESCE(
            (SELECT $typeAggFunc(
                con.conname || ':' || con.contype::text
                $hashConstraintAggTail
            )
            FROM pg_catalog.pg_constraint con
            WHERE con.conrelid = c.oid),
            ''
        )
    ) AS "hash_code_constraints"
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'f')
    AND ('tables:' || n.nspname || '.' || c.relname) =OBJECT_ID_CONDITION
    AND n.nspname <> 'pg_internal'
    AND n.nspname !~ '^_timescaledb_'
    AND n.nspname =SCHEMA_NAME_CONDITION
`;
