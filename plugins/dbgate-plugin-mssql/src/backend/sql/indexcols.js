module.exports = `
select c.object_id, c.index_id, c.column_id, c.is_descending_key, c.is_included_column from sys.index_columns c

where c.object_id =OBJECT_ID_CONDITION
order by c.key_ordinal

`;
