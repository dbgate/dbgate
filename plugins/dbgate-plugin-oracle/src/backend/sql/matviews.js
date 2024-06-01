module.exports = `
SELECT -- owner as schema_name,
       mview_name pure_name,
       container_name,
       '' || trim(
         extractvalue(
                  dbms_xmlgen.getxmltype('SELECT query
                                          FROM all_mviews
                                          WHERE mview_name=''' ||
                                                MVIEW_NAME || ''' AND
                                                owner = ''' ||
                                                owner || ''''
                                         ),
                  '//text()'
                )) definition
FROM all_mviews
where OWNER = '$owner' AND 'matviews:' || mview_name=OBJECT_ID_CONDITION
order by owner, mview_name
`;