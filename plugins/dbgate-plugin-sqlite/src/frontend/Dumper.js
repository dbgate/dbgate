const { SqlDumper, arrayToHexString } = global.DBGATE_PACKAGES['dbgate-tools'];

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
    this.put('^select last_insert_rowid()');
  }

  columnDefinition(column, flags) {
    if (column.dataType && column.dataType.toLowerCase().includes('int') && column.notNull && column.autoIncrement) {
      this.put('^integer ^primary ^key ^autoincrement');
      return;
    }
    super.columnDefinition(column, flags);
  }

  createTablePrimaryKeyCore(table) {
    const column = table.columns.find((x) => x.autoIncrement);
    if (column && column.dataType && column.dataType.toLowerCase().includes('int') && column.notNull) {
      return;
    }
    super.createTablePrimaryKeyCore(table);
  }

  enableAllForeignKeys(enabled) {
    this.putCmd('^pragma ^foreign_keys = %s', enabled ? 'on' : 'off');
  }
}

module.exports = Dumper;
