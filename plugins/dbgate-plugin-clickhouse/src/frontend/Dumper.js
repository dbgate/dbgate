const { SqlDumper } = require('dbgate-tools');

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
    this.endCommand();
  }

  columnType(dataType) {
    this.putRaw(dataType);
  }

  renameColumn(column, newcol) {
    this.putCmd('^alter ^table %f ^rename ^column %i ^to %i', column, column.columnName, newcol);
  }
}

module.exports = Dumper;
