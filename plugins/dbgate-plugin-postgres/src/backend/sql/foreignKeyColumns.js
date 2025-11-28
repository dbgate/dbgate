module.exports = `
SELECT
    tc.table_schema as schema_name,
    tc.table_name as pure_name,
    tc.constraint_name,
    tc_pk.table_schema        AS ref_schema_name,
    tc_pk.table_name          AS ref_table_name,
    rc.unique_constraint_name,
    kcu.column_name,
    kcu.ordinal_position,
    ccu.column_name           AS ref_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON  tc.constraint_name = kcu.constraint_name
    AND tc.table_schema   = kcu.table_schema
JOIN information_schema.referential_constraints AS rc
    ON  rc.constraint_name  = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
JOIN information_schema.table_constraints AS tc_pk
    ON  tc_pk.constraint_name  = rc.unique_constraint_name
    AND tc_pk.constraint_schema = rc.unique_constraint_schema
JOIN information_schema.key_column_usage AS ccu
    ON  ccu.constraint_name  = rc.unique_constraint_name
    AND ccu.constraint_schema = rc.unique_constraint_schema
    AND ccu.ordinal_position  = kcu.position_in_unique_constraint
WHERE tc.constraint_type = 'FOREIGN KEY'
AND (('tables:' || tc.table_schema || '.' || tc.table_name) =OBJECT_ID_CONDITION AND tc.table_schema =SCHEMA_NAME_CONDITION)
OR 
(('tables:' || tc_pk.table_schema || '.' || tc_pk.table_name) =OBJECT_ID_CONDITION AND tc.table_schema =SCHEMA_NAME_CONDITION)
ORDER BY
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.ordinal_position
;
`;
