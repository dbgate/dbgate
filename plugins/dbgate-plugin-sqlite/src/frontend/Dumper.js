const { SqlDumper, arrayToHexString } = global.DBGATE_TOOLS;

class Dumper extends SqlDumper {
  renameColumn(column, newcol) {
    this.putCmd('^alter ^table %f ^rename ^column %i ^to %i', column, column.columnName, newcol);
  }

  renameTable(obj, newname) {
    this.putCmd('^alter ^table %f ^rename ^to %i', obj, newname);
  }

  putByteArrayValue(value) {
    this.putRaw(`x'${arrayToHexString(value)}'`);
  }

  truncateTable(name) {
    this.putCmd('^delete ^from %f', name);
  }

  selectScopeIdentity() {
    this.put('^select last_insert_rowid()')
  }
}

module.exports = Dumper;
