module.exports = {
  // Quotes an identifier (table, column, etc.) for DB2
  quoteIdentifier(identifier) {
    return `"${identifier.replace(/"/g, '""')}"`;
  },

  // Generates a CREATE TABLE statement for DB2
  createTable({ tableName, columns }) {
    const cols = columns.map(
      col => `${this.quoteIdentifier(col.name)} ${col.type}${col.nullable ? '' : ' NOT NULL'}`
    ).join(',\n  ');
    return `CREATE TABLE ${this.quoteIdentifier(tableName)} (\n  ${cols}\n);`;
  },

  // Generates a DROP TABLE statement for DB2
  dropTable({ tableName }) {
    return `DROP TABLE ${this.quoteIdentifier(tableName)};`;
  },

  // Example: Generates a SELECT statement for DB2
  selectAll({ tableName }) {
    return `SELECT * FROM ${this.quoteIdentifier(tableName)};`;
  },

  // Add more helpers as needed for your plugin
}; 