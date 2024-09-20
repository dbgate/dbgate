module.exports = `
SELECT 
	o.name as pureName,
	u.name as schemaName,
	o.object_id as objectId,
	o.create_date as createDate,
	o.modify_date as modifyDate
FROM sys.objects o INNER JOIN sys.schemas u ON u.schema_id=o.schema_id 
WHERE type in ('V') and o.object_id =OBJECT_ID_CONDITION and u.name =SCHEMA_NAME_CONDITION
`;
