module.exports = `
SELECT 
  name as "pure_name",
  type as "object_type",
  LISTAGG(text, '') WITHIN GROUP (ORDER BY line) AS "source_code",
  ora_hash(LISTAGG(text, '') WITHIN GROUP (ORDER BY line)) AS "hash_code"
FROM all_source
WHERE type in ('FUNCTION', 'PROCEDURE') AND OWNER = '$owner'
GROUP BY name, type
`;
