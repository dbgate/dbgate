module.exports = `
select o.object_id as objectId, o.modify_date as modifyDate, o.type, o.name as pureName, s.name as schemaName
from sys.objects o 
inner join sys.schemas s on o.schema_id = s.schema_id
where o.type in ('U', 'V', 'P', 'IF', 'FN', 'TF', 'TR')
    and s.name =SCHEMA_NAME_CONDITION
`;
