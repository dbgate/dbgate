module.exports = `
  SELECT
    d.name,
    d.database_id,
    d.state_desc as status,
    d.recovery_model_desc as recoveryModel,
    d.collation_name as collation,
    d.compatibility_level as compatibilityLevel,
    d.is_read_only as isReadOnly,
    CAST(SUM(CASE WHEN mf.type = 0 THEN mf.size * 8192.0 ELSE 0 END) AS BIGINT) AS sizeOnDisk,
    CAST(SUM(CASE WHEN mf.type = 1 THEN mf.size * 8192.0 ELSE 0 END) AS BIGINT) AS logSizeOnDisk
  FROM sys.databases d
  LEFT JOIN sys.master_files mf ON d.database_id = mf.database_id
  GROUP BY d.name, d.database_id, d.state_desc, d.recovery_model_desc, d.collation_name,
           d.compatibility_level, d.is_read_only
  ORDER BY d.name
`;
