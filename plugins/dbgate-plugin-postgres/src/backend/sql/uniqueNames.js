module.exports = `
    select cnt.conname as "constraint_name" from pg_constraint cnt 
    inner join pg_namespace c on c.oid = cnt.connamespace
     where cnt.contype = 'u' and c.nspname =SCHEMA_NAME_CONDITION
`;
