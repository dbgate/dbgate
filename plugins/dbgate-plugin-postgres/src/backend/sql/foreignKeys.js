module.exports = `
SELECT 
    nsp.nspname AS table_schema,
    rel.relname AS table_name,
    con.conname AS constraint_name,
    nsp2.nspname AS ref_table_schema,
    rel2.relname AS ref_table_name,
    att.attname AS column_name,
    att2.attname AS ref_column_name,
    CASE con.confupdtype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
        ELSE con.confupdtype::text
    END AS update_action,
    CASE con.confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
        ELSE con.confdeltype::text
    END AS delete_action
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
JOIN pg_class rel2 ON rel2.oid = con.confrelid
JOIN pg_namespace nsp2 ON nsp2.oid = rel2.relnamespace
JOIN LATERAL unnest(con.conkey, con.confkey) WITH ORDINALITY AS cols(attnum, ref_attnum, ordinal_position) ON TRUE
JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = cols.attnum
JOIN pg_attribute att2 ON att2.attrelid = con.confrelid AND att2.attnum = cols.ref_attnum
WHERE con.contype = 'f'
    AND ('tables:' || nsp.nspname || '.' || rel.relname) =OBJECT_ID_CONDITION
    AND nsp.nspname =SCHEMA_NAME_CONDITION
ORDER BY con.conname, cols.ordinal_position
;
`;
