module.exports = `
SELECT 
    rowid AS objectId,
    name AS pureName,
    CASE 
        WHEN sql LIKE '% AFTER %' THEN 'AFTER'
        WHEN sql LIKE '% BEFORE %' THEN 'BEFORE'
        WHEN sql LIKE '% INSTEAD OF %' THEN 'INSTEAD OF'
        ELSE 'UNKNOWN'
    END AS triggerTiming,
    CASE 
        WHEN sql LIKE '% INSERT %' THEN 'INSERT'
        WHEN sql LIKE '% UPDATE %' THEN 'UPDATE'
        WHEN sql LIKE '% DELETE %' THEN 'DELETE'
        ELSE NULL
    END AS eventType,
    tbl_name AS tableName,
    sql AS createSql
FROM 
    sqlite_master
WHERE 
    type = 'trigger';
`;
