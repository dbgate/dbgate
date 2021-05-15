module.exports = `
select o.object_id, pureName = t.Table_Name, schemaName = t.Table_Schema, columnName = c.Column_Name, constraintName=t.constraint_name from 
    INFORMATION_SCHEMA.TABLE_CONSTRAINTS t,
    sys.objects o,
    sys.schemas s,
    INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE c
where
    c.Constraint_Name = t.Constraint_Name
    and t.table_name = o.name 
    and o.schema_id = s.schema_id and t.Table_Schema = s.name
    and c.Table_Name = t.Table_Name
    and Constraint_Type = 'PRIMARY KEY'
	and o.object_id =OBJECT_ID_CONDITION
`;
