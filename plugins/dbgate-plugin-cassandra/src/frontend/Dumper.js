/**
 * @type {{ SqlDumper: import('dbgate-types').SqlDumper}}
 */
const { SqlDumper } = global.DBGATE_PACKAGES['dbgate-tools'];

class Dumper extends SqlDumper {
  /**
   * @param {import('dbgate-types').ColumnInfo} column
   * @param {string} newName
   *
   * @returns {void}
   */
  renameColumn(column, newName) {
    this.putCmd('^alter ^table %f ^rename %i ^to %i', column, column.columnName, newName);
  }

  /**
   * @param {import('dbgate-types').ColumnInfo} column
   *
   * @returns {void}
   */
  dropColumn(column) {
    this.putCmd('^alter ^table %f ^drop %i', column, column.columnName);
  }
}

module.exports = Dumper;
