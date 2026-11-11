const { SqlDumper } = global.DBGATE_PACKAGES['dbgate-tools'];

class Dumper extends SqlDumper {
  setTableOptionCore(table, optionName, optionValue, formatString) {
    this.put('^alter ^table %f ^modify ', table);
    this.put(formatString, optionValue);
  }

  changeColumn(oldcol, newcol, constraints) {
    if (oldcol.columnName != newcol.columnName) {
      this.putCmd('^alter ^table %f ^rename ^column %i ^to %i', oldcol, oldcol.columnName, newcol.columnName);
    }

    this.put('^alter ^table %f ^modify ^column %i ', newcol, newcol.columnName);
    this.columnDefinition(newcol);
    if (oldcol.defaultValue != null && newcol.defaultValue == null) {
      this.put(' ^remove ^default ');
    }
    this.endCommand();
  }

  changeColumnPosition(column, afterColumnName) {
    // ClickHouse requires data type in MODIFY COLUMN, other column properties (default, comment, codec) are kept
    this.put('^alter ^table %f ^modify ^column %i ', column, column.columnName);
    this.columnType(column.dataType);
    if (afterColumnName) {
      this.put(' ^after %i', afterColumnName);
    } else {
      this.put(' ^first');
    }
    this.endCommand();
  }

  columnType(dataType) {
    this.putRaw(dataType || this.dialect.fallbackDataType);
  }

  renameColumn(column, newcol) {
    this.putCmd('^alter ^table %f ^rename ^column %i ^to %i', column, column.columnName, newcol);
  }

  renameTable(obj, newName) {
    this.putCmd('^rename ^table %f ^to %i', obj, newName);
  }

  tableOptions(table) {
    super.tableOptions(table);
    if (table.sortingKey) {
      this.put(
        '&n^order ^by (%,i)',
        table.sortingKey.columns.map((x) => x.columnName)
      );
    }
  }

  autoIncrement() {}
}

module.exports = Dumper;
