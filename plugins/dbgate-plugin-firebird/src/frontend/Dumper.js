const { SqlDumper } = global.DBGATE_PACKAGES['dbgate-tools'];

class Dumper extends SqlDumper {
  autoIncrement() {
    this.put(' ^generated ^by ^default ^as ^identity');
  }

  dropColumn(column) {
    this.putCmd('^alter ^table %f ^drop %i', column, column.columnName);
  }

  renameColumn(column, newName) {
    this.putCmd('^alter ^table %f ^alter ^column %i ^to %i', column, column.columnName, newName);
  }

  changeColumn(oldcol, newcol, constraints) {
    if (oldcol.columnName != newcol.columnName) {
      this.putCmd('^alter ^table %f ^alter ^column %i ^to %i', oldcol, oldcol.columnName, newcol.columnName);
    }

    if (oldcol.notNull != newcol.notNull) {
      if (newcol.notNull) {
        this.putCmd('^alter ^table %f ^alter ^column %i ^set ^not ^null', newcol, newcol.columnName);
      } else {
        this.putCmd('^alter ^table %f ^alter ^column %i ^drop ^not ^null', newcol, newcol.columnName);
      }
    }

    if (oldcol.defaultValue != newcol.defaultValue) {
      if (newcol.defaultValue) {
        this.putCmd(
          '^alter ^table %f ^alter ^column %i ^set ^default %s',
          newcol,
          newcol.columnName,
          newcol.defaultValue
        );
      } else {
        this.putCmd('^alter ^table %f ^alter ^column %i ^drop ^default', newcol, newcol.columnName);
      }
    }
  }
}

module.exports = Dumper;
