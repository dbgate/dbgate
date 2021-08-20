module.exports = `
    select
        t.relname as "table_name",
        c.nspname as "schema_name",
        i.relname as "index_name",
        ix.indisprimary as "is_primary",
        ix.indisunique as "is_unique",
        array_to_string(array_agg(a.attname), '|') as "column_names"
    from
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a,
        pg_namespace c
    where
        t.oid = ix.indrelid
        and i.oid = ix.indexrelid
        and a.attrelid = t.oid
        and a.attnum = ANY(ix.indkey)
        and t.relkind = 'r'
        and ix.indisprimary = false
        and t.relnamespace = c.oid
        and c.nspname != 'pg_catalog'
        and ('tables:' || c.nspname || '.' ||  t.relname) =OBJECT_ID_CONDITION
    group by
        i.oid,
        t.relname,
        i.relname,
        c.nspname,
        ix.indisprimary,
        ix.indisunique
    order by
        t.relname,
        i.relname
`;
