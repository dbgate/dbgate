const { userDefinedTypesFilter, userDefinedTypesHashExpression } = require('./userDefinedTypesCommon');

module.exports = `
SELECT
  t.typname AS "pure_name",
  n.nspname AS "schema_name",
  ${userDefinedTypesHashExpression} AS "hash_code"
FROM pg_catalog.pg_type t
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE ${userDefinedTypesFilter}
  AND n.nspname =SCHEMA_NAME_CONDITION
`;
