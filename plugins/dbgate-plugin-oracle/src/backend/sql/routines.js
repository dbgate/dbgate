module.exports = `
select
  routine_name as "pure_name",
  -- routine_schema as "schema_name",
  routine_definition as "definition",
  standard_hash(routine_definition, 'MD5') as "hash_code",
  routine_type as "object_type",
  'fixme_data_type' as "data_type",
  'fixme_external_language' as "language"
from (select
    sys_context('userenv', 'DB_NAME')                                                          routine_catalog,
    sys_context('userenv', 'DB_NAME')                                                          specific_catalog,
    ap.owner                                                                                   specific_schema,
    ap.owner                                                                                   routine_schema,
    decode( ap.procedure_name, null, ap.object_name || ap.procedure_name, ap.procedure_name )  specific_name,
    decode( ap.procedure_name, null, ap.object_name || ap.procedure_name, ap.procedure_name )  routine_name,
    ao.object_type                                                                             routine_type,
    decode(impltypeowner, null, to_char(null), SYS_CONTEXT('userenv', 'DB_NAME'))              type_udt_catalog,
    --to_clob(get_proc_text(ap.owner, ap.object_name, ao.object_type, 32767))                    routine_body,
    'fixme_routine_body.' || ap.owner || '.' || decode( ap.procedure_name, null, ap.object_name || ap.procedure_name, ap.procedure_name ) routine_body,
    --to_clob(get_proc_text(ap.owner, ap.object_name, ao.object_type,  4000))                    routine_definition,
    'fixme_routine_definition.' || ap.owner || '.' || decode( ap.procedure_name, null, ap.object_name || ap.procedure_name, ap.procedure_name ) routine_definition,
    sys_context('userenv', 'DB_NAME')                                                          character_set_catalog,
   'SYS'                                                                                       character_set_schema,
    sys_context('userenv', 'DB_NAME')                                                          collation_catalog,
   'SYS'                                                                                       collation_schema,
    deterministic                                                                              is_deterministic,
    pipelined                                                                                  is_pipelined ,
    aggregate                                                                                  is_aggregate,
    authid                                                                                     is_definer
  from
    all_procedures ap,
    all_objects    ao
  where
    ap.owner = '$owner' and
    ap.owner       = ao.owner       and
    ap.object_name = ao.object_name and
    ao.object_type in ('PACKAGE', 'PROCEDURE', 'FUNCTION')
    and ao.object_name =OBJECT_ID_CONDITION
    ) routines
`;
