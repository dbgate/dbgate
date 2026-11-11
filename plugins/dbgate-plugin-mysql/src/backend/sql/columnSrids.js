// spatial reference ID of spatial columns (MySQL 8.0.3+ only, MariaDB doesn't have SRS_ID column)
module.exports = `
select 
	TABLE_NAME as pureName, 
	COLUMN_NAME as columnName,
	SRS_ID as srid
from INFORMATION_SCHEMA.COLUMNS
where TABLE_SCHEMA = '#DATABASE#' and TABLE_NAME =OBJECT_ID_CONDITION and SRS_ID is not null
`;
