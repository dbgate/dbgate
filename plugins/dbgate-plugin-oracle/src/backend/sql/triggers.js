module.exports = `
SELECT
    TRIGGER_TYPE AS "trigger_timing",
    TRIGGERING_EVENT AS "event_type",
    TRIGGER_BODY AS "definition",
    TRIGGER_NAME AS "trigger_name",
    TABLE_NAME AS "table_name",
    OWNER,
    CASE
        WHEN INSTR(TRIGGER_TYPE, 'ROW') > 0 THEN 'ROW'
        WHEN INSTR(TRIGGER_TYPE, 'STATEMENT') > 0 THEN 'STATEMENT'
        ELSE NULL
    END AS trigger_level
FROM
    all_triggers
WHERE
    OWNER='$owner'
    AND 'tables:' || TABLE_NAME =OBJECT_ID_CONDITION
`;
