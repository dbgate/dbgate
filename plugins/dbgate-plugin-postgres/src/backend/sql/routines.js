module.exports = `
select 
  routine_name as "pure_name",
  routine_schema as "schema_name",
  max(routine_definition) as "definition",
  max($md5Function(routine_definition)) as "hash_code",
  routine_type as "object_type",
  $typeAggFunc(data_type $typeAggParam) as "data_type",
  max(external_language) as "language"
from
  information_schema.routines where routine_schema !~ '^_timescaledb_' 
  and routine_schema =SCHEMA_NAME_CONDITION
  and (
   (routine_type = 'PROCEDURE' and ('procedures:' || routine_schema || '.' ||  routine_name) =OBJECT_ID_CONDITION)
   or
   (routine_type = 'FUNCTION' and ('functions:' || routine_schema || '.' ||  routine_name) =OBJECT_ID_CONDITION)
  )
 group by routine_name, routine_schema, routine_type
`;
