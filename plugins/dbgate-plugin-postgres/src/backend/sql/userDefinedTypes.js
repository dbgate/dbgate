const {
  userDefinedTypesFilter,
  userDefinedTypesRangeDefinition,
  userDefinedTypesHashExpression,
} = require('./userDefinedTypesCommon');

module.exports = `
SELECT
  t.typname AS "pure_name",
  n.nspname AS "schema_name",
  CASE t.typtype
    WHEN 'e' THEN 'enum'
    WHEN 'c' THEN 'composite'
    WHEN 'd' THEN 'domain'
    WHEN 'r' THEN 'range'
  END AS "type_kind",
  pg_catalog.format_type(t.typbasetype, t.typtypmod) AS "base_type",
  t.typnotnull AS "not_null",
  t.typdefault AS "default_value",
  (
    SELECT string_agg('CONSTRAINT ' || quote_ident(con.conname) || ' ' || pg_catalog.pg_get_constraintdef(con.oid), '
  ' ORDER BY con.conname)
    FROM pg_catalog.pg_constraint con WHERE con.contypid = t.oid
  ) AS "constraint_sql",
  (
    SELECT pg_catalog.format_type(r.rngsubtype, NULL) FROM pg_catalog.pg_range r WHERE r.rngtypid = t.oid
  ) AS "range_subtype",
  (
    SELECT rd."range_definition" FROM (${userDefinedTypesRangeDefinition}) rd WHERE rd."rngtypid" = t.oid
  ) AS "range_definition",
  pg_catalog.obj_description(t.oid, 'pg_type') AS "object_comment",
  ${userDefinedTypesHashExpression} AS "hash_code"
FROM pg_catalog.pg_type t
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE ${userDefinedTypesFilter}
  AND n.nspname =SCHEMA_NAME_CONDITION
  AND ('userDefinedTypes:' || n.nspname || '.' || t.typname) =OBJECT_ID_CONDITION
`;
