module.exports = `
SELECT 
    m.name as tableName,
    il.name as constraintName,
    il."unique" as isUnique,
    ii.name as columnName,
    il.origin
  FROM sqlite_schema AS m,
       pragma_index_list(m.name) AS il,
       pragma_index_info(il.name) AS ii
 WHERE m.type='table' AND il.origin <> 'pk'
 ORDER BY ii.seqno, il.name
  
`;
