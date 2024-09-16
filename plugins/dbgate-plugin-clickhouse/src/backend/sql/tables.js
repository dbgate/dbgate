module.exports = `
select name as "pureName", metadata_modification_time as "contentHash", total_rows as "tableRowCount", uuid as "objectId", comment as "objectComment",
engine as "tableEngine", primary_key as "primaryKeyColumns", sorting_key as "sortingKeyColumns" 
from system.tables 
where database='#DATABASE#' and uuid =OBJECT_ID_CONDITION and engine != 'View';
`;
