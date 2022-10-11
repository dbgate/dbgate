module.exports = `
select
  table_name as "pure_name",
  table_schema as "schema_name",
  table_name as "create_sql",
  ora_hash(view_definition, 3768421) as "hash_code" -- fixme
from (select
  sys_context('userenv', 'DB_NAME') table_catalog,
  owner                             table_schema,
  view_name                         table_name,
  text                              view_definition,
 'VIEW'                             table_type,
 (select max( case when uuc.updatable  = 'YES' or
                              uuc.deletable  = 'YES' or
                              uuc.insertable = 'YES' then 'YES' else 'NO' end
             )
     from
       user_updatable_columns uuc
     where
       uuc.owner      = av.owner and
       uuc.table_name = av.view_name
 )                                 is_updatable,
 decode(
  (select 1
    from
      all_constraints ac
    where
      ac.owner           = av.owner     and
      ac.table_name      = av.view_name and
      ac.constraint_type = 'V'), 1, 'CASCADE', 'NONE') check_option
from
  all_views av
  where   text is not null
  ) views
 where  table_name =OBJECT_ID_CONDITION
`;
