module.exports = `
SELECT 
  session_id as processId,
  ISNULL(host_name, 'Unknown') + ':' + ISNULL(CAST(host_process_id AS VARCHAR(10)), '?') as client,
  ISNULL(DB_NAME(database_id), 'master') as namespace,
  ISNULL(DATEDIFF(SECOND, last_request_start_time, GETDATE()), 0) as runningTime,
  status as state
FROM sys.dm_exec_sessions 
WHERE is_user_process = 1
ORDER BY session_id
`;
