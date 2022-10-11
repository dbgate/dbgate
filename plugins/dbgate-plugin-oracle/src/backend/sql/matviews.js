module.exports = `
select owner as schema_name,
       mview_name pure_name,
       container_name,
       query as definition,
         ora_hash(query, 'MD5') as "hash_code"
       --refresh_mode,
       --refresh_method,
       --build_mode,
       --last_refresh_date,
       --ompile_state
from all_mviews
where mview_name=OBJECT_ID_CONDITION
order by owner, mview_name
`;
