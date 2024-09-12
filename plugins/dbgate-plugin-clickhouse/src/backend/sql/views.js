module.exports = `
select 
    tables.name as "pureName",
    tables.uuid as "objectId",
    views.view_definition as "viewDefinition",
    tables.metadata_modification_time as "contentHash"
from information_schema.views 
inner join system.tables on views.table_name = tables.name and views.table_schema = tables.database
where views.table_schema='#DATABASE#' and tables.uuid =OBJECT_ID_CONDITION
`;
