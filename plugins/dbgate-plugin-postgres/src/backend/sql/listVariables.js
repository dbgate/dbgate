module.exports = `
SELECT "name" AS "variable", "setting" AS "value" 
FROM "pg_settings" 
ORDER BY "name"
`;
