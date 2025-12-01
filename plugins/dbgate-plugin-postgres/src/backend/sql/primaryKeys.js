module.exports = `
SELECT
    n.nspname        AS "constraint_schema",
    c.conname        AS "constraint_name",
    n.nspname        AS "schema_name",
    t.relname        AS "pure_name",
    a.attname        AS "column_name"
FROM pg_catalog.pg_constraint AS c
JOIN pg_catalog.pg_class AS t
  ON t.oid = c.conrelid
JOIN pg_catalog.pg_namespace AS n
  ON n.oid = t.relnamespace
JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS cols(attnum, ordinal_position)
  ON TRUE
JOIN pg_catalog.pg_attribute AS a
  ON a.attrelid = t.oid
 AND a.attnum   = cols.attnum
WHERE 
    c.contype = 'p'  -- PRIMARY KEY
    AND n.nspname !~ '^_timescaledb_' 
    AND ('tables:' || n.nspname || '.' || t.relname) =OBJECT_ID_CONDITION
    AND n.nspname =SCHEMA_NAME_CONDITION
ORDER BY cols.ordinal_position
`;
