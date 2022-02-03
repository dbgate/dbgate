const { SqlDumper } = global.DBGATE_TOOLS;

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
}

module.exports = Dumper;
