module.exports = `
select
    -- owner "schema_name",
    table_name "pure_name",
    num_rows * avg_row_len "size_bytes",
    num_rows "table_row_count"
  from
    all_tables
  where OWNER='$owner' AND 'tables:' || TABLE_NAME =OBJECT_ID_CONDITION
`;

