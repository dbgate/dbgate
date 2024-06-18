module.exports = `
select
  -- pk.owner as "constraint_schema",
  pk.constraint_name as "constraint_name",
  -- pk.owner as "schema_name",
  pk.table_name as "pure_name",
  basecol.column_name as "column_name"
from all_cons_columns basecol,
 all_constraints pk
where constraint_type = 'P'
and basecol.owner = pk.owner
and basecol.constraint_name = pk.constraint_name
and basecol.table_name = pk.table_name
and 'tables:' || basecol.table_name =OBJECT_ID_CONDITION
and pk.owner = '$owner'
order by basecol.position
`;
