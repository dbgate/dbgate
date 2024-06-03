const { SqlDumper, arrayToHexString, testEqualTypes } = global.DBGATE_TOOLS;

class Dumper extends SqlDumper {
  createDatabase(name) {
    this.putCmd(
      `CREATE USER c##${name}
    IDENTIFIED BY ${name}
    DEFAULT TABLESPACE users
    TEMPORARY TABLESPACE temp
    QUOTA 10M ON users;`,
      name
    );
  }

  // oracle uses implicit transactions
  beginTransaction() {}

  columnDefinition(col, options) {
    if (col.autoIncrement) {
      super.columnType(col.dataType);
      this.put(' ^generated ^by ^default ^on ^null ^as ^identity');
      return;
    }
    super.columnDefinition(col, options);
  }

  // /** @param type {import('dbgate-types').TransformType} */
  // transform(type, dumpExpr) {
  //   switch (type) {
  //     case 'GROUP:YEAR':
  //     case 'YEAR':
  //       this.put('^extract(^year ^from %c)', dumpExpr);
  //       break;
  //     case 'MONTH':
  //       this.put('^extract(^month ^from %c)', dumpExpr);
  //       break;
  //     case 'DAY':
  //       this.put('^extract(^day ^from %c)', dumpExpr);
  //       break;
  //     case 'GROUP:MONTH':
  //       this.put("^to_char(%c, '%s')", dumpExpr, 'YYYY-MM');
  //       break;
  //     case 'GROUP:DAY':
  //       this.put("^to_char(%c, '%s')", dumpExpr, 'YYYY-MM-DD');
  //       break;
  //     default:
  //       dumpExpr();
  //       break;
  //   }
  // }

  // dropRecreatedTempTable(tmptable) {
  //   this.putCmd('^drop ^table %i ^cascade', tmptable);
  // }

  // renameTable(obj, newname) {
  //   this.putCmd('^alter ^table %f ^rename ^to %i', obj, newname);
  // }

  // renameColumn(column, newcol) {
  //   this.putCmd('^alter ^table %f ^rename ^column %i ^to %i', column, column.columnName, newcol);
  // }

  // dropTable(obj, options = {}) {
  //   this.put('^drop ^table');
  //   if (options.testIfExists) this.put(' ^if ^exists');
  //   this.put(' %f', obj);
  //   this.endCommand();
  // }

  // //public override void CreateIndex(IndexInfo ix)
  // //{
  // //}

  // enableConstraints(table, enabled) {
  //   this.putCmd('^alter ^table %f %k ^trigger ^all', table, enabled ? 'enable' : 'disable');
  // }

  // columnDefinition(col, options) {
  //   if (col.autoIncrement) {
  //     this.put('^serial');
  //     return;
  //   }
  //   super.columnDefinition(col, options);
  // }

  // changeColumn(oldcol, newcol, constraints) {
  //   if (oldcol.columnName != newcol.columnName) {
  //     this.putCmd('^alter ^table %f ^rename ^column %i ^to %i', oldcol, oldcol.columnName, newcol.columnName);
  //   }
  //   if (!testEqualTypes(oldcol, newcol)) {
  //     this.putCmd('^alter ^table %f ^alter ^column %i ^type %s', oldcol, newcol.columnName, newcol.dataType);
  //   }
  //   if (oldcol.notNull != newcol.notNull) {
  //     if (newcol.notNull) this.putCmd('^alter ^table %f ^alter ^column %i ^set ^not ^null', newcol, newcol.columnName);
  //     else this.putCmd('^alter ^table %f ^alter ^column %i ^drop ^not ^null', newcol, newcol.columnName);
  //   }
  //   if (oldcol.defaultValue != newcol.defaultValue) {
  //     if (newcol.defaultValue == null) {
  //       this.putCmd('^alter ^table %f ^alter ^column %i ^drop ^default', newcol, newcol.columnName);
  //     } else {
  //       this.putCmd(
  //         '^alter ^table %f ^alter ^column %i ^set ^default %s',
  //         newcol,
  //         newcol.columnName,
  //         newcol.defaultValue
  //       );
  //     }
  //   }
  // }

  // putValue(value) {
  //   if (value === true) this.putRaw('true');
  //   else if (value === false) this.putRaw('false');
  //   else super.putValue(value);
  // }

  // putByteArrayValue(value) {
  //   this.putRaw(`e'\\\\x${arrayToHexString(value)}'`);
  // }
}

module.exports = Dumper;
