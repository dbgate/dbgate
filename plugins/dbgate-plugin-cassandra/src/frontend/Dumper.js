/**
 * @type {{ SqlDumper: import('dbgate-types').SqlDumper}}
 */
const { SqlDumper } = global.DBGATE_PACKAGES['dbgate-tools'];

const numericDataTypes = ['tinyint', 'smallint', 'int', 'bigint', 'varint', 'float', 'double', 'decimal'];
const stringDataTypes = ['text', 'varchar'];

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

  /**
   * @param {import('dbgate-types').ColumnInfo} column
   *
   * @returns {void}
   */
  createDatabase(name, replicationCalss = 'SimpleStrategy', replicationFactor = 1) {
    this.putCmd(
      "^create ^keyspace %s ^with replication = {'class': '%s','replication_factor': %s}",
      name,
      replicationCalss,
      replicationFactor
    );
  }

  /**
   * @param {import('dbgate-types').NamedObjectInfo} obj
   *
   * @returns {void}
   */
  dropDatabase(name) {
    this.putCmd('^drop ^keyspace %s', name);
  }

  /**
   * @param {string} value
   * @param {string} dataType
   *
   * @returns {void}
   */
  putValue(value, dataType) {
    if (
      dataType?.toLowerCase() === 'uuid' &&
      value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    ) {
      this.putRaw(value);
      return;
    }

    if (numericDataTypes.includes(dataType?.toLowerCase()) && !Number.isNaN(parseFloat(value))) {
      this.putRaw(parseFloat(value));
      return;
    }

    if (stringDataTypes.includes(dataType?.toLowerCase())) {
      super.putValue(value?.toString());
      return;
    }

    super.putValue(value);
  }
}

module.exports = Dumper;
