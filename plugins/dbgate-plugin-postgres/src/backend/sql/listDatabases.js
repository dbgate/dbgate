module.exports = `
SELECT 
  "datname" AS "name",
  pg_database_size("datname") AS "sizeOnDisk",
  0 AS "tableCount",
  0 AS "viewCount", 
  0 AS "matviewCount"
FROM "pg_database" 
WHERE "datistemplate" = false
ORDER BY pg_database_size("datname") DESC
`;
