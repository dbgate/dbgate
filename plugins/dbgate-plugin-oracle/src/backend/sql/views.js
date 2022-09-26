module.exports = `
select
ao.owner as "schema_name", ao.object_name as "pure_name",
  'later' as "create_sql",
  object_id as "hash_code"
from all_objects ao
where exists(select null from user_objects uo where uo.object_id = ao.object_id)
and object_type = 'VIEW'
`;
