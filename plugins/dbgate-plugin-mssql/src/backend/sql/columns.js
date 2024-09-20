module.exports = `
select c.name as columnName, t.name as dataType, c.object_id as objectId, c.is_identity as isIdentity,
	c.max_length as maxLength, c.precision, c.scale, c.is_nullable as isNullable,
	col.CHARACTER_MAXIMUM_LENGTH as charMaxLength,
	d.definition as defaultValue, d.name as defaultConstraint,
	m.definition as computedExpression, m.is_persisted as isPersisted, c.column_id as columnId, 
	col.NUMERIC_PRECISION as numericPrecision,
	col.NUMERIC_SCALE as numericScale,
	-- TODO only if version >= 2008
	c.is_sparse as isSparse
from sys.columns c
inner join sys.types t on c.system_type_id = t.system_type_id and c.user_type_id = t.user_type_id
inner join sys.objects o on c.object_id = o.object_id
INNER JOIN sys.schemas u ON u.schema_id=o.schema_id 
INNER JOIN INFORMATION_SCHEMA.COLUMNS col ON col.TABLE_NAME = o.name AND col.TABLE_SCHEMA = u.name and col.COLUMN_NAME = c.name
left join sys.default_constraints d on c.default_object_id = d.object_id
left join sys.computed_columns m on m.object_id = c.object_id and m.column_id = c.column_id
where o.type = 'U' and o.object_id =OBJECT_ID_CONDITION and u.name =SCHEMA_NAME_CONDITION
order by c.column_id
`;
