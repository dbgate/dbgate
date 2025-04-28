module.exports = `SELECT * from duckdb_columns() WHERE internal = false and (schema_name || '.' || table_name) =OBJECT_ID_CONDITION`;
