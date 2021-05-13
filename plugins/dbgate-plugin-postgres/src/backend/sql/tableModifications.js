module.exports = `
with pkey as
(
    select cc.conrelid, 'create constraint ' || cc.conname || ' primary key(' || 
      string_agg(a.attname, ', ' order by array_position(cc.conkey, a.attnum)) || ');\\n'
      pkey
    from pg_catalog.pg_constraint cc
        join pg_catalog.pg_class c on c.oid = cc.conrelid
        join pg_catalog.pg_attribute a on a.attrelid = cc.conrelid 
            and a.attnum = any(cc.conkey)
    where cc.contype = 'p'
    group by cc.conrelid, cc.conname
)


SELECT oid as "objectId", nspname as "schemaName", relname as "pureName",
  md5('CREATE TABLE ' || nspname || '.' || relname || E'\\n(\\n' ||
  array_to_string(
    array_agg(
      '    ' || column_name || ' ' ||  type || ' '|| not_null
    )
    , E',\\n'
  ) || E'\\n);\\n' || coalesce((select pkey from pkey where pkey.conrelid = oid),'NO_PK')) as "hashCode"
from
(
  SELECT 
    c.relname, a.attname AS column_name, c.oid,
    n.nspname,
    pg_catalog.format_type(a.atttypid, a.atttypmod) as type,
    case 
      when a.attnotnull
    then 'NOT NULL' 
    else 'NULL' 
    END as not_null 
  FROM pg_class c,
   pg_namespace n,
   pg_attribute a,
   pg_type t

   WHERE c.relkind = 'r'
   AND a.attnum > 0
   AND a.attrelid = c.oid
   AND a.atttypid = t.oid
   AND n.oid = c.relnamespace
    AND n.nspname <> 'pg_catalog'
    AND n.nspname <> 'information_schema'
    AND n.nspname !~ '^pg_toast'
 ORDER BY a.attnum
) as tabledefinition
where ('tables:' || nspname || '.' ||  relname) =OBJECT_ID_CONDITION
group by relname, nspname, oid
`;
