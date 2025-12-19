module.exports = `
WITH stats AS (
  SELECT
    r.rdb$relation_name                             AS rel_name,
    /* Prefer PK stats; fall back to any unique active index */
    COALESCE(
      (SELECT i.rdb$statistics
         FROM rdb$relation_constraints rc
         JOIN rdb$indices i ON i.rdb$index_name = rc.rdb$index_name
        WHERE rc.rdb$relation_name = r.rdb$relation_name
          AND rc.rdb$constraint_type = 'PRIMARY KEY'),
      (SELECT FIRST 1 i2.rdb$statistics
         FROM rdb$indices i2
        WHERE i2.rdb$relation_name = r.rdb$relation_name
          AND i2.rdb$unique_flag = 1
          AND i2.rdb$index_inactive = 0
        ORDER BY i2.rdb$index_name)
    ) AS stat
  FROM rdb$relations r
  WHERE COALESCE(r.rdb$system_flag, 0) = 0
    AND COALESCE(r.rdb$relation_type, 0) = 0
)
SELECT
    TRIM(RDB$RELATION_NAME) AS "pureName",
    RDB$DESCRIPTION AS "objectComment",
    RDB$FORMAT AS "objectTypeField",
    
    CAST(
      CASE WHEN s.stat IS NOT NULL AND s.stat > 0
           THEN 1.0 / s.stat
           ELSE NULL
      END AS BIGINT
    )                         AS "tableRowCount"
    
FROM
    RDB$RELATIONS r
    LEFT JOIN stats s ON s.rel_name = r.rdb$relation_name
WHERE
    r.RDB$SYSTEM_FLAG = 0 -- only user-defined tables
AND
    r.RDB$RELATION_TYPE = 0 -- only tables (not views, etc.)
AND
    ('tables:' || TRIM(r.RDB$RELATION_NAME)) =OBJECT_ID_CONDITION
ORDER BY
    "pureName";`;
