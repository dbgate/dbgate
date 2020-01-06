select
	o.name as tableName, s.name as schemaName, o.objectId,
	o.createDate, o.modifyDate 
from sys.tables o
inner join sys.schemas s on o.schema_id = s.schema_id
where o.object_id =[OBJECT_ID_CONDITION]
