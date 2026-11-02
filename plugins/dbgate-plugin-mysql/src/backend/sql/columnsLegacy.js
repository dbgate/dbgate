// fallback for servers without GENERATION_EXPRESSION column (MySQL < 5.7, MariaDB < 10.2)
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
	EXTRA as extra,
	CHARACTER_SET_NAME as characterSet,
	COLLATION_NAME as collation
from INFORMATION_SCHEMA.COLUMNS
where TABLE_SCHEMA = '#DATABASE#' and TABLE_NAME =OBJECT_ID_CONDITION
order by ORDINAL_POSITION
`;
