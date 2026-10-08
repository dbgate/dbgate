// Shared SQL fragments for analysing user defined types (enums, composites, domains, ranges).
// Only types created by user are listed - array types, table row types, multiranges
// and types owned by an extension (eg. postgis) are skipped.
const userDefinedTypesFilter = `
  t.typtype IN ('e', 'c', 'd', 'r')
  AND (t.typrelid = 0 OR (SELECT c.relkind FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid) = 'c')
  AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
  AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_depend dep
    WHERE dep.objid = t.oid AND dep.classid = 'pg_catalog.pg_type'::regclass AND dep.deptype = 'e'
  )
  AND n.nspname NOT IN ('pg_catalog', 'pg_toast', 'information_schema')
`;

// SUBTYPE and the optional functions of a range type, formatted as body of CREATE TYPE ... AS RANGE (...)
const userDefinedTypesRangeDefinition = `
  SELECT
    r.rngtypid AS "rngtypid",
    'SUBTYPE = ' || pg_catalog.format_type(r.rngsubtype, NULL)
      || CASE WHEN r.rngcanonical = 0 THEN '' ELSE ', CANONICAL = ' || r.rngcanonical::regproc::text END
      || CASE WHEN r.rngsubdiff = 0 THEN '' ELSE ', SUBTYPE_DIFF = ' || r.rngsubdiff::regproc::text END
      AS "range_definition"
  FROM pg_catalog.pg_range r
`;

// Covers all parts used for building createSql, so that any change of the type is detected
const userDefinedTypesHashExpression = `
  $md5Function(
    t.typtype::text
    || coalesce(pg_catalog.format_type(t.typbasetype, t.typtypmod), '')
    || coalesce(t.typdefault, '')
    || t.typnotnull::text
    || coalesce((
      SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder)
      FROM pg_catalog.pg_enum e WHERE e.enumtypid = t.oid
    ), '')
    || coalesce((
      SELECT string_agg(a.attname || ':' || pg_catalog.format_type(a.atttypid, a.atttypmod), ',' ORDER BY a.attnum)
      FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = t.typrelid AND a.attnum > 0 AND NOT a.attisdropped
    ), '')
    || coalesce((
      SELECT string_agg(pg_catalog.pg_get_constraintdef(con.oid), ',' ORDER BY con.conname)
      FROM pg_catalog.pg_constraint con WHERE con.contypid = t.oid
    ), '')
    || coalesce((SELECT rd."range_definition" FROM (${userDefinedTypesRangeDefinition}) rd WHERE rd."rngtypid" = t.oid), '')
  )
`;

module.exports = {
  userDefinedTypesFilter,
  userDefinedTypesRangeDefinition,
  userDefinedTypesHashExpression,
};
