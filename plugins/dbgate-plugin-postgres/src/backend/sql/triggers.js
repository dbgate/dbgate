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
    COALESCE(
    CASE WHEN (tgtype::int::bit(7) & b'0000010')::int = 0 THEN NULL ELSE 'BEFORE' END,
    CASE WHEN (tgtype::int::bit(7) & b'0000010')::int = 0 THEN 'AFTER' ELSE NULL END,
    CASE WHEN (tgtype::int::bit(7) & b'1000000')::int = 0 THEN NULL ELSE 'INSTEAD OF' END,
    ''
  )::text as trigger_timing, 
    (CASE WHEN (tgtype::int::bit(7) & b'0000100')::int = 0 THEN '' ELSE 'INSERT' END) ||
    (CASE WHEN (tgtype::int::bit(7) & b'0001000')::int = 0 THEN '' ELSE 'DELETE' END) ||
    (CASE WHEN (tgtype::int::bit(7) & b'0010000')::int = 0 THEN '' ELSE 'UPDATE' END) ||
    (CASE WHEN (tgtype::int::bit(7) & b'0100000')::int = 0 THEN '' ELSE 'TRUNCATE' END)
  as event_type,
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
