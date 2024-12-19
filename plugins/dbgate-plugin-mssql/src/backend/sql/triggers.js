module.exports = `
SELECT 
   o.modify_date as modifyDate,
   o.object_id as objectId,
   o.name AS triggerName,
   s.name AS schemaName,
   OBJECT_NAME(o.parent_object_id) AS tableName,
   CASE 
       WHEN OBJECTPROPERTY(o.object_id, 'ExecIsAfterTrigger') = 1 THEN 'AFTER'
       WHEN OBJECTPROPERTY(o.object_id, 'ExecIsInsteadOfTrigger') = 1 THEN 'INSTEAD OF'
       ELSE 'BEFORE'
   END AS triggerTiming,
   CASE 
       WHEN OBJECTPROPERTY(o.object_id, 'ExecIsInsertTrigger') = 1 THEN 'INSERT'
       WHEN OBJECTPROPERTY(o.object_id, 'ExecIsUpdateTrigger') = 1 THEN 'UPDATE'
       WHEN OBJECTPROPERTY(o.object_id, 'ExecIsDeleteTrigger') = 1 THEN 'DELETE'
   END AS eventType,
   OBJECT_DEFINITION(o.object_id) AS definition
FROM sys.objects o
INNER JOIN sys.tables t 
   ON o.parent_object_id = t.object_id 
INNER JOIN sys.schemas s
   ON t.schema_id = s.schema_id
WHERE o.type = 'TR'
  AND o.is_ms_shipped = 0 
  AND o.object_id =OBJECT_ID_CONDITION
  AND s.name =SCHEMA_NAME_CONDITION
`;
