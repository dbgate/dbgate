const { SqlDumper, arrayToHexString, testEqualTypes } = global.DBGATE_PACKAGES['dbgate-tools'];

class Dumper extends SqlDumper {
  /** @param type {import('dbgate-types').TransformType} */
  transform(type, dumpExpr) {
    switch (type) {
      case 'GROUP:YEAR':
      case 'YEAR':
        this.put('^extract(^year ^from %c)', dumpExpr);
        break;
      case 'MONTH':
        this.put('^extract(^month ^from %c)', dumpExpr);
        break;
      case 'DAY':
        this.put('^extract(^day ^from %c)', dumpExpr);
        break;
      case 'GROUP:MONTH':
        this.put("^to_char(%c, '%s')", dumpExpr, 'YYYY-MM');
        break;
      case 'GROUP:DAY':
        this.put("^to_char(%c, '%s')", dumpExpr, 'YYYY-MM-DD');
        break;
      default:
        dumpExpr();
        break;
    }
  }

  dropDatabase(name) {
    this.putCmd('^drop ^database %i ^with(^force)', name);
  }

  dropRecreatedTempTable(tmptable) {
    this.putCmd('^drop ^table %i ^cascade', tmptable);
  }

  renameTable(obj, newname) {
    this.putCmd('^alter ^table %f ^rename ^to %i', obj, newname);
  }

  renameSqlObject(obj, newname) {
    this.putCmd('^alter %k %f ^rename ^to %i', this.getSqlObjectSqlName(obj.objectTypeField), obj, newname);
  }

  renameColumn(column, newcol) {
    this.putCmd('^alter ^table %f ^rename ^column %i ^to %i', column, column.columnName, newcol);
  }

  dropTable(obj, options = {}) {
    this.put('^drop ^table');
    if (options.testIfExists) this.put(' ^if ^exists');
    this.put(' %f', obj);
    this.endCommand();
  }

  //public override void CreateIndex(IndexInfo ix)
  //{
  //}

  enableConstraints(table, enabled) {
    this.putCmd('^alter ^table %f %k ^trigger ^all', table, enabled ? 'enable' : 'disable');
  }

  columnDefinition(col, options) {
    if (col.autoIncrement) {
      this.put('^serial');
      return;
    }
    super.columnDefinition(col, options);
  }

  changeColumn(oldcol, newcol, constraints) {
    if (oldcol.columnName != newcol.columnName) {
      this.putCmd('^alter ^table %f ^rename ^column %i ^to %i', oldcol, oldcol.columnName, newcol.columnName);
    }
    if (!testEqualTypes(oldcol, newcol)) {
      this.putCmd('^alter ^table %f ^alter ^column %i ^type %s', oldcol, newcol.columnName, newcol.dataType);
    }
    if (oldcol.defaultValue != newcol.defaultValue) {
      if (newcol.defaultValue == null) {
        this.putCmd('^alter ^table %f ^alter ^column %i ^drop ^default', newcol, newcol.columnName);
      } else {
        this.putCmd(
          '^alter ^table %f ^alter ^column %i ^set ^default %s',
          newcol,
          newcol.columnName,
          newcol.defaultValue
        );
      }
    }
    if (oldcol.notNull != newcol.notNull) {
      if (!oldcol.notNull) {
        this.fillNewNotNullDefaults(newcol);
      }
      if (newcol.notNull) this.putCmd('^alter ^table %f ^alter ^column %i ^set ^not ^null', newcol, newcol.columnName);
      else this.putCmd('^alter ^table %f ^alter ^column %i ^drop ^not ^null', newcol, newcol.columnName);
    }
  }

  putValue(value) {
    if (value === true) this.putRaw('true');
    else if (value === false) this.putRaw('false');
    else super.putValue(value);
  }

  putByteArrayValue(value) {
    this.putRaw(`e'\\\\x${arrayToHexString(value)}'`);
  }

  selectScopeIdentity(table) {
    const column = table.columns && table.columns.find(x => x.autoIncrement);
    this.put("^SELECT currval(pg_get_serial_sequence('%f','%s'))", table, column ? column.columnName : null);
  }

  callableTemplate(func) {
    const putDeclareParamters = parameters => {
      for (const param of parameters.filter(i => i.parameterMode != 'RETURN')) {
        if (param.parameterMode == 'IN') {
          this.put('%s %s := :%s', param.parameterName, param.dataType, param.parameterName);
          this.endCommand();
        } else {
          this.put('%s %s', param.parameterName, param.dataType);
          this.endCommand();
        }
      }
      this.put('&n');
    };

    const putParameters = (parameters, delimiter) => {
      this.putCollection(delimiter, parameters || [], param => {
        this.putRaw(param.parameterName);
      });
    };

    if (func.objectTypeField == 'procedures') {
      this.put('^do $$&n');
      this.put('^declare&n');
      putDeclareParamters(func.parameters);
      this.put('^begin&n');
      this.put('^call %f(&>&n', func);
      putParameters(func.parameters, ',&n');
      this.put('&<&n)');
      this.endCommand();
      this.put('&n');
      this.put('^end $$');
      this.endCommand();
    }

    if (func.objectTypeField == 'functions') {
      this.put('^do $$&n');
      this.put('^declare&n');
      this.put('result %s', func.returnType);
      this.endCommand();
      putDeclareParamters(func.parameters);
      this.put('^begin&n');
      this.put('result := %f(&>&n', func);
      putParameters(func.parameters, ',&n');
      this.put('&<&n)');
      this.endCommand();
      this.put('&n');
      this.put('^end $$');
      this.endCommand();
    }
  }
}

module.exports = Dumper;
