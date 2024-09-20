module.exports = `
select 
    c.object_id, c.index_id, c.column_id, 
    col.name as columnName,
    c.is_descending_key as isDescending, c.is_included_column as isIncludedColumn
from sys.index_columns c
inner join sys.columns col on c.object_id = col.object_id and c.column_id = col.column_id
inner join sys.objects o on c.object_id = o.object_id
INNER JOIN sys.schemas u ON u.schema_id=o.schema_id 
where c.object_id =OBJECT_ID_CONDITION and u.name =SCHEMA_NAME_CONDITION
order by c.key_ordinal
`;
