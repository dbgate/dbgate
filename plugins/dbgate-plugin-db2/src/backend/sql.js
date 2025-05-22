module.exports = {
  // fetch all schema names
  schemas: `
    SELECT SCHEMANAME AS name
      FROM SYSCAT.SCHEMATA
      WHERE SCHEMANAME NOT LIKE 'SYS%'
  `,

  // fetch all tables per schema
  tables: `
    SELECT TABNAME AS name,
           TABSCHEMA AS schema,
           'TABLE' AS type
      FROM SYSCAT.TABLES
      WHERE TABSCHEMA = ?
      AND TYPE = 'T'
  `,

  // fetch all views per schema
  views: `
    SELECT TABNAME AS name,
           TABSCHEMA AS schema,
           'VIEW' AS type,
           TEXT AS definition
      FROM SYSCAT.VIEWS
      WHERE TABSCHEMA = ?
  `,

  // fetch all functions per schema
  functions: `
    SELECT ROUTINENAME AS name,
           ROUTINESCHEMA AS schema,
           'FUNCTION' AS type,
           TEXT AS definition
      FROM SYSCAT.ROUTINES
      WHERE ROUTINESCHEMA = ?
      AND ROUTINETYPE = 'F'
  `,

  // fetch all procedures per schema
  procedures: `
    SELECT ROUTINENAME AS name,
           ROUTINESCHEMA AS schema,
           'PROCEDURE' AS type,
           TEXT AS definition
      FROM SYSCAT.ROUTINES
      WHERE ROUTINESCHEMA = ?
      AND ROUTINETYPE = 'P'
  `,

  // fetch all columns per table
  columns: `
    SELECT COLNAME AS name,
           TYPENAME AS type,
           LENGTH AS length,
           SCALE AS scale,
           NULLS AS nullable,
           TABNAME AS tableName,
           TABSCHEMA AS schema
      FROM SYSCAT.COLUMNS
      WHERE TABSCHEMA = ?
      AND TABNAME = ?
      ORDER BY COLNO
  `,
};
