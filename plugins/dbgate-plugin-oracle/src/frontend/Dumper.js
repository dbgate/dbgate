const { SqlDumper, arrayToHexString, testEqualTypes } = global.DBGATE_PACKAGES['dbgate-tools'];

class Dumper extends SqlDumper {
  createDatabase(name) {
    this.put(
      `CREATE USER c##${name}
    IDENTIFIED BY ${name}
    DEFAULT TABLESPACE users
    TEMPORARY TABLESPACE temp
    QUOTA 10M ON users`
    );
  }

  dropDatabase(name) {
    this.put(`DROP USER ${name}`);
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

  renameColumn(column, newcol) {
    this.putCmd('^alter ^table %f ^rename ^column %i ^to %i', column, column.columnName, newcol);
  }

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

  changeColumn(oldcol, newcol, constraints) {
    if (oldcol.columnName != newcol.columnName) {
      this.putCmd('^alter ^table %f ^rename ^column %i ^to %i', oldcol, oldcol.columnName, newcol.columnName);
    }

    if (!oldcol.notNull) {
      this.fillNewNotNullDefaults(newcol);
    }

    if (!testEqualTypes(oldcol, newcol) || oldcol.notNull != newcol.notNull) {
      this.putCmd(
        '^alter ^table %f ^modify (%i %s %k)',
        newcol,
        newcol.columnName,
        newcol.dataType,
        newcol.notNull ? 'not null' : 'null'
      );
    }

    if (oldcol.defaultValue != newcol.defaultValue) {
      if (newcol.defaultValue?.trim()) {
        this.putCmd('^alter ^table %f ^modify (%i ^default %s)', newcol, newcol.columnName, newcol.defaultValue);
      } else {
        this.putCmd('^alter ^table %f ^modify (%i ^default ^null)', newcol, newcol.columnName);
      }
    }
  }

  selectScopeIdentity(table) {
    const sequence = table.identitySequenceName;
    if (sequence) {
      this.put('^select %i.CURRVAL FROM DUAL', sequence);
    }
  }

  renameTable(obj, newname) {
    this.putCmd('^alter ^table %f ^rename ^to %i', obj, newname);
  }

  renameSqlObject(obj, newname) {
    this.putCmd('^rename %f ^to %i', obj, newname);
  }

  // putValue(value) {
  //   if (value === true) this.putRaw('true');
  //   else if (value === false) this.putRaw('false');
  //   else super.putValue(value);
  // }

  // putByteArrayValue(value) {
  //   this.putRaw(`e'\\\\x${arrayToHexString(value)}'`);
  // }

  putValue(value, dataType) {
    if (dataType?.toLowerCase() == 'timestamp') {
      this.putRaw(`TO_TIMESTAMP('${value}', 'YYYY-MM-DD"T"HH24:MI:SS')`);
    } else if (dataType?.toLowerCase() == 'date') {
      this.putRaw(`TO_DATE('${value}', 'YYYY-MM-DD"T"HH24:MI:SS')`);
    } else {
      super.putValue(value);
    }
  }
}

module.exports = Dumper;
