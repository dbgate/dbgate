module.exports = `
SELECT 
  "pid" AS "processId",
  "application_name" AS "client",
  "client_addr" AS "connectionId",
  "state" AS "state",
  "query" AS "operation",
  EXTRACT(EPOCH FROM (NOW() - "state_change")) AS "runningTime",
  "wait_event" IS NOT NULL AS "waitingFor"
FROM "pg_stat_activity" 
WHERE "state" IS NOT NULL
ORDER BY "pid"
`;
