module.exports = `
select 
    tables.name as "pureName",
    tables.uuid as "objectId",
    tables.metadata_modification_time as "contentHash"
from system.tables
where tables.database='#DATABASE#' and tables.uuid =OBJECT_ID_CONDITION and tables.engine = 'View'
`;
