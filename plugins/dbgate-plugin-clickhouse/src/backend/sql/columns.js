module.exports = `
select 
    columns.table as "pureName",
    tables.uuid as "objectId",
    columns.name as "columnName",
    columns.type as "dataType",
    columns.comment as "columnComment"
from system.columns 
inner join system.tables on columns.table = tables.name and columns.database = tables.database
where columns.database='#DATABASE#' and tables.uuid =OBJECT_ID_CONDITION
order by toInt32(columns.position)
`;
