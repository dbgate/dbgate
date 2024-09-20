module.exports = `
    select
        t.relname as "table_name",
        c.nspname as "schema_name",
        i.relname as "index_name",
        ix.indisprimary as "is_primary",
        ix.indisunique as "is_unique",
        ix.indkey as "indkey",
        ix.indoption as "indoption",
        t.oid as "oid"
    from
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_namespace c
    where
        t.oid = ix.indrelid
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
