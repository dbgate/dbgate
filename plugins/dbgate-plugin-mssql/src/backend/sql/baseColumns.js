module.exports = `
select c.object_id as objectId,
	ep.value as columnComment,
  c.column_id as columnId
from sys.columns c
inner join sys.objects o on c.object_id = o.object_id
INNER JOIN sys.schemas u ON u.schema_id=o.schema_id 
INNER JOIN sys.extended_properties ep on ep.major_id = c.object_id and ep.minor_id = c.column_id and ep.name = 'MS_Description'
where o.type IN ('U', 'V') and o.object_id =OBJECT_ID_CONDITION and u.name =SCHEMA_NAME_CONDITION
order by c.column_id
`;
