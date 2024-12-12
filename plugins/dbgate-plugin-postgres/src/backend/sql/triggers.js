module.exports = `
SELECT 
    t.oid AS trigger_id,
    t.tgname AS trigger_name,
    n.nspname AS schema_name,
    c.relname AS table_name,
    p.proname AS function_name,
    t.tgtype AS original_tgtype,
    CASE 
        WHEN t.tgtype & 1 = 1 THEN 'ROW' 
        ELSE 'STATEMENT' 
    END AS trigger_level,
    CASE 
           WHEN tgtype & 2 = 2 THEN 'AFTER'
           WHEN tgtype & 1 = 1 THEN 'BEFORE'
        ELSE NULL
    END AS trigger_timing,
    CASE 
           WHEN tgtype & 32 = 32 THEN 'TRUNCATE'
           WHEN tgtype & 16 = 16 THEN 'UPDATE'
           WHEN tgtype & 8 = 8 THEN 'DELETE'
           WHEN tgtype & 4 = 4 THEN 'INSERT'
        ELSE NULL
    END AS event_type,
    pg_get_triggerdef(t.oid) AS definition
FROM 
    pg_trigger t
JOIN 
    pg_class c ON c.oid = t.tgrelid
JOIN 
    pg_namespace n ON n.oid = c.relnamespace
JOIN 
    pg_proc p ON p.oid = t.tgfoid
WHERE 
    NOT t.tgisinternal AND n.nspname =SCHEMA_NAME_CONDITION
`;
