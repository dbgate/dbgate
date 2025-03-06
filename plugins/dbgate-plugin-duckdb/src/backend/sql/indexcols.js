module.exports = `
    select
        a.attname as "column_name",
        a.attnum as "attnum",
        a.attrelid as "oid"
    from
        pg_class t,
        pg_class i,
        pg_attribute a,
        pg_index ix,
        pg_namespace c
    where
        t.oid = ix.indrelid
        and a.attnum = ANY(ix.indkey)
        and a.attrelid = t.oid
        and i.oid = ix.indexrelid
        and t.relkind = 'r'
        and ix.indisprimary = false
        and t.relnamespace = c.oid
        and c.nspname != 'pg_catalog'
        and ('tables:' || c.nspname || '.' ||  t.relname) =OBJECT_ID_CONDITION
        and c.nspname =SCHEMA_NAME_CONDITION
    order by
        t.relname
`;
