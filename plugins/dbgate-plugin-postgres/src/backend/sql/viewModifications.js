module.exports = `
SELECT
  c.relname AS "pure_name",
  n.nspname AS "schema_name",
  $md5Function(pg_get_viewdef(c.oid, true)) AS "hash_code"
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
  AND n.nspname != 'information_schema'
  AND n.nspname != 'pg_catalog'
  AND n.nspname !~ '^_timescaledb_'
  AND n.nspname =SCHEMA_NAME_CONDITION
`;
