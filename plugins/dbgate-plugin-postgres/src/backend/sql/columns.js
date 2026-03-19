module.exports = `
SELECT
    n.nspname AS "schema_name",
    c.relname AS "pure_name",
    a.attname AS "column_name",
    CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS "is_nullable",
    format_type(a.atttypid, NULL) AS "data_type",
    CASE
        WHEN a.atttypmod > 0 AND t.typname IN ('varchar', 'bpchar', 'char') THEN a.atttypmod - 4
        WHEN a.atttypmod > 0 AND t.typname IN ('bit', 'varbit') THEN a.atttypmod
        ELSE NULL
    END AS "char_max_length",
    CASE
        WHEN a.atttypmod > 0 AND t.typname = 'numeric' THEN ((a.atttypmod - 4) >> 16) & 65535
        ELSE NULL
    END AS "numeric_precision",
    CASE
        WHEN a.atttypmod > 0 AND t.typname = 'numeric' THEN (a.atttypmod - 4) & 65535
        ELSE NULL
    END AS "numeric_scale",
    pg_get_expr(d.adbin, d.adrelid) AS "default_value"
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE a.attnum > 0
    AND NOT a.attisdropped
    AND c.relkind IN ('r', 'v', 'p', 'f')
    AND n.nspname !~ '^_timescaledb_'
    AND (
        ('tables:' || n.nspname || '.' || c.relname) =OBJECT_ID_CONDITION
        OR
        ('views:' || n.nspname || '.' || c.relname) =OBJECT_ID_CONDITION
    )
    AND n.nspname =SCHEMA_NAME_CONDITION
ORDER BY a.attnum
`;