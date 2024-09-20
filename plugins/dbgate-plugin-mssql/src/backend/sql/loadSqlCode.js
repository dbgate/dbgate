module.exports = `
select s.name as pureName, u.name as schemaName, c.text AS codeText
    from sys.objects s
    inner join sys.syscomments c on s.object_id = c.id
    inner join sys.schemas u on u.schema_id = s.schema_id
where (s.object_id =OBJECT_ID_CONDITION) and u.name =SCHEMA_NAME_CONDITION
order by u.name, s.name, c.colid
`;
