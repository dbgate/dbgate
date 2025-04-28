module.exports = `SELECT * FROM duckdb_views() WHERE internal = false and (schema_name || '.' || view_name) =OBJECT_ID_CONDITION`;
