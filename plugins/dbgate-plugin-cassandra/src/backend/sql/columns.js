module.exports = `
SELECT
  table_name as "pureName",
  column_name as "columnName",
  type as "dataType",
  kind as "kind"
FROM system_schema.columns 
WHERE keyspace_name = '#DATABASE#'
`;
