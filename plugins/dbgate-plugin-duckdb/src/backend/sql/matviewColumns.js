module.exports = `
SELECT pg_namespace.nspname AS "schema_name"
    , pg_class.relname AS "pure_name"
    , pg_attribute.attname AS "column_name"
    , pg_catalog.format_type(pg_attribute.atttypid, pg_attribute.atttypmod) AS "data_type"
FROM pg_catalog.pg_class
    INNER JOIN pg_catalog.pg_namespace
        ON pg_class.relnamespace = pg_namespace.oid
    INNER JOIN pg_catalog.pg_attribute
        ON pg_class.oid = pg_attribute.attrelid
-- Keeps only materialized views, and non-db/catalog/index columns 
WHERE pg_class.relkind = 'm'
    AND pg_attribute.attnum >= 1
    AND ('matviews:' || pg_namespace.nspname || '.' || pg_class.relname) =OBJECT_ID_CONDITION
    AND pg_namespace.nspname =SCHEMA_NAME_CONDITION

ORDER BY pg_attribute.attnum
`;
