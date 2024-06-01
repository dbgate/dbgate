module.exports = `
select avv.*,
  ora_hash("create_sql") as "hash_code"
from (select
  view_name as "pure_name",
  -- owner as "schema_name",
  SUBSTR(text_vc, 1, 3900) AS "create_sql"
  from all_views av
  where owner = '$owner' and text_vc is not null
  ) avv
  where 'views:' || "pure_name" =OBJECT_ID_CONDITION
`;
