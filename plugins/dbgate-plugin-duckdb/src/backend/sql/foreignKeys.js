module.exports = `
SELECT 
    nsp.nspname AS table_schema,
    rel.relname AS table_name,
    con.conname AS constraint_name,
    nsp2.nspname AS ref_table_schema,
    rel2.relname AS ref_table_name,
    conpk.conname AS unique_constraint_name
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
JOIN pg_class rel2 ON rel2.oid = con.confrelid
JOIN pg_namespace nsp2 ON nsp2.oid = rel2.relnamespace
JOIN pg_constraint conpk 
    ON conpk.conrelid = con.confrelid 
   AND conpk.conkey = con.confkey
   AND conpk.contype IN ('p','u')  -- 'p' = primary key, 'u' = unique constraint
WHERE con.contype = 'f' AND ('tables:' || nsp.nspname || '.' || rel.relname) =OBJECT_ID_CONDITION AND nsp.nspname =SCHEMA_NAME_CONDITION
;
`;
