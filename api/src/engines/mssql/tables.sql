select
	o.name as pureName, s.name as schemaName, o.object_id,
	o.create_date, o.modify_date 
from sys.tables o
inner join sys.schemas s on o.schema_id = s.schema_id
where o.object_id =[OBJECT_ID_CONDITION]
