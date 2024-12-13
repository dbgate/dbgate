module.exports = `
select avv.*
from (select
  view_name as "pure_name",
  text as "create_sql"
  from all_views av
  where owner = '$owner' and text is not null
  ) avv
  where 'views:' || "pure_name" is not null
`;
