module.exports = `
WITH view_defs AS (
  SELECT
    c.relname AS pure_name,
    n.nspname AS schema_name,
    pg_get_viewdef(c.oid, true) AS viewdef
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'v'
    AND n.nspname !~ '^_timescaledb_'
    AND n.nspname =SCHEMA_NAME_CONDITION
    AND ('views:' || n.nspname || '.' || c.relname) =OBJECT_ID_CONDITION
)
SELECT
  pure_name AS "pure_name",
  schema_name AS "schema_name",
  viewdef AS "create_sql",
  $md5Function(viewdef) AS "hash_code"
FROM view_defs
`;
