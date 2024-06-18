module.exports = `
select  i.table_name as "tableName",
        -- i.table_owner as "schemaName",
        i.index_name as "constraintName",
        i.index_type as "indexType",
        i.uniqueness as "Unique",
        ic.column_name as "columnName",
        ic.descend as "descending"
from all_ind_columns ic, all_indexes i
where INDEX_OWNER = '$owner' AND ic.index_owner = i.owner
and ic.index_name = i.index_name
and 'tables:' || i.table_name =OBJECT_ID_CONDITION
order by i.table_owner,
         i.table_name,
         i.index_name,
         ic.column_position
`;
