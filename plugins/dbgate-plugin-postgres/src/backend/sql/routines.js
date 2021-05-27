module.exports = `
select 
  routine_name as "pure_name",
  routine_schema as "schema_name",
  routine_definition as "definition",
  md5(routine_definition) as "hash_code",
  routine_type as "object_type",
  external_language as "language"
from
  information_schema.routines where routine_schema != 'information_schema' and routine_schema != 'pg_catalog' 
  and (
   (routine_type = 'PROCEDURE' and ('procedures:' || routine_schema || '.' ||  routine_name) =OBJECT_ID_CONDITION)
   or
   (routine_type = 'FUNCTION' and ('functions:' || routine_schema || '.' ||  routine_name) =OBJECT_ID_CONDITION)
  )
`;
