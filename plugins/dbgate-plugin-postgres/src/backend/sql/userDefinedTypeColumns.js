const { userDefinedTypesFilter } = require('./userDefinedTypesCommon');

// Enum labels and composite type attributes, ordered by their position in the type
module.exports = `
SELECT
  t.typname AS "pure_name",
  n.nspname AS "schema_name",
  'enum' AS "member_type",
  e.enumlabel AS "enum_label",
  NULL AS "column_name",
  NULL AS "data_type",
  row_number() OVER (PARTITION BY t.oid ORDER BY e.enumsortorder) AS "position"
FROM pg_catalog.pg_type t
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
JOIN pg_catalog.pg_enum e ON e.enumtypid = t.oid
WHERE ${userDefinedTypesFilter}
  AND n.nspname =SCHEMA_NAME_CONDITION
  AND ('userDefinedTypes:' || n.nspname || '.' || t.typname) =OBJECT_ID_CONDITION

UNION ALL

SELECT
  t.typname AS "pure_name",
  n.nspname AS "schema_name",
  'composite' AS "member_type",
  NULL AS "enum_label",
  a.attname AS "column_name",
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS "data_type",
  a.attnum AS "position"
FROM pg_catalog.pg_type t
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
JOIN pg_catalog.pg_attribute a ON a.attrelid = t.typrelid
WHERE ${userDefinedTypesFilter}
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND n.nspname =SCHEMA_NAME_CONDITION
  AND ('userDefinedTypes:' || n.nspname || '.' || t.typname) =OBJECT_ID_CONDITION
`;
