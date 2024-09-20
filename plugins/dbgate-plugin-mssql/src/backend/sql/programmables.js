module.exports = `
select o.name as pureName, s.name as schemaName, o.object_id as objectId, o.create_date as createDate, o.modify_date as modifyDate, o.type as sqlObjectType
from sys.objects o 
inner join sys.schemas s on o.schema_id = s.schema_id
where o.type in ('P', 'IF', 'FN', 'TF') and o.object_id =OBJECT_ID_CONDITION and s.name =SCHEMA_NAME_CONDITION
`;
