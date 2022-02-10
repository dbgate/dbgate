module.exports = `
select 
	TABLE_NAME as pureName, 
	COLUMN_NAME as columnName,
	IS_NULLABLE as isNullable,
	DATA_TYPE as dataType,
	CHARACTER_MAXIMUM_LENGTH as charMaxLength,
	NUMERIC_PRECISION as numericPrecision,
	NUMERIC_SCALE as numericScale,
	COLUMN_DEFAULT as defaultValue,
	COLUMN_COMMENT as columnComment,
	COLUMN_TYPE as columnType,
	EXTRA as extra
from INFORMATION_SCHEMA.COLUMNS
where TABLE_SCHEMA = '#DATABASE#' and TABLE_NAME =OBJECT_ID_CONDITION
order by ORDINAL_POSITION
`;
