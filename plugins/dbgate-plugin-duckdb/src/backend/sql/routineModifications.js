module.exports = `
select 
  routine_name as "pure_name",
  routine_schema as "schema_name",
  $md5Function(routine_definition) as "hash_code",
  routine_type as "object_type"
from
  information_schema.routines where routine_schema !~ '^_timescaledb_' 
  and routine_type in ('PROCEDURE', 'FUNCTION') and routine_schema =SCHEMA_NAME_CONDITION
`;
