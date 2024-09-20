module.exports = `
select 
    o.object_id AS objectId,
    col.TABLE_SCHEMA as schemaName, 
    col.TABLE_NAME as pureName, 
	col.COLUMN_NAME as columnName,
	col.IS_NULLABLE as isNullable,
	col.DATA_TYPE as dataType,
	col.CHARACTER_MAXIMUM_LENGTH as charMaxLength,
	col.NUMERIC_PRECISION as precision,
	col.NUMERIC_SCALE as scale,
	col.COLUMN_DEFAULT
FROM sys.objects o 
INNER JOIN sys.schemas u ON u.schema_id=o.schema_id 
INNER JOIN INFORMATION_SCHEMA.COLUMNS col ON col.TABLE_NAME = o.name AND col.TABLE_SCHEMA = u.name
WHERE o.type in ('V') and o.object_id =OBJECT_ID_CONDITION and u.name =SCHEMA_NAME_CONDITION
order by col.ORDINAL_POSITION
`;
