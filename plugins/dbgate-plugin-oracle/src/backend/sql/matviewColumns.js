module.exports = `
SELECT -- owner "schema_name"
     table_name "pure_name"
    , column_name "column_name"
    , data_type "data_type"
  FROM all_tab_columns av
  where OWNER = '$owner' AND table_name =OBJECT_ID_CONDITION
order by column_id
`;
