module.exports = {
  // fetch all schema names
  schemas: `
    SELECT SCHEMANAME AS name
      FROM SYSCAT.SCHEMATA
  `,

  // fetch all tables per schema
  tables: `
    SELECT TABNAME AS name,
           TABSCHEMA AS schema
      FROM SYSCAT.TABLES
  `,

  // fetch all columns per table
  columns: `
    SELECT COLNAME AS name,
           TYPENAME AS type,
           LENGTH AS length,
           TABNAME   AS tableName,
           TABSCHEMA AS schema
      FROM SYSCAT.COLUMNS
  `,
};
