const { SqlDumper, testEqualColumns, arrayToHexString } = global.DBGATE_PACKAGES['dbgate-tools'];

class MsSqlDumper extends SqlDumper {
  constructor(driver, options) {
    super(driver);
    if (options && options.useHardSeparator) {
      this.useHardSeparator = true;
    }
  }

  endCommand() {
    if (this.useHardSeparator) {
      this.putRaw('\nGO\n');
    } else {
      super.endCommand();
    }
  }

  dropDatabase(name) {
    this.putCmd(
      `USE master;
      ALTER DATABASE %i SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      DROP DATABASE %i`,
      name,
      name
    );
  }

  autoIncrement() {
    this.put(' ^identity');
  }

  putStringValue(value) {
    if (/[^\u0000-\u00ff]/.test(value)) {
      this.putRaw('N');
    }
    super.putStringValue(value);
  }

  putByteArrayValue(value) {
    super.putRaw('0x' + arrayToHexString(value));
  }

  allowIdentityInsert(table, allow) {
    this.putCmd('^set ^identity_insert %f %k', table, allow ? 'on' : 'off');
  }

  /** @param type {import('dbgate-types').TransformType} */
  transform(type, dumpExpr) {
    switch (type) {
      case 'GROUP:YEAR':
      case 'YEAR':
        this.put('^datepart(^year, %c)', dumpExpr);
        break;
      case 'MONTH':
        this.put('^datepart(^month, %c)', dumpExpr);
        break;
      case 'DAY':
        this.put('^datepart(^day, %c)', dumpExpr);
        break;
      case 'GROUP:MONTH':
        this.put(
          "^convert(^varchar(100), ^datepart(^year, %c)) + '-' + right('0' + ^convert(^varchar(100), ^datepart(^month, %c)), 2)",
          dumpExpr,
          dumpExpr
        );
        break;
      case 'GROUP:DAY':
        this.put(
          "^convert(^varchar(100), ^datepart(^year, %c)) + '-' + ^right('0' + ^convert(^varchar(100), ^datepart(^month, %c)), 2)+'-' + ^right('0' + ^convert(^varchar(100), ^datepart(^day, %c)), 2)",
          dumpExpr,
          dumpExpr,
          dumpExpr
        );
        break;
      default:
        dumpExpr();
        break;
    }
  }

  renameObject(obj, newname) {
    this.putCmd("^execute sp_rename '%f', '%s', 'OBJECT'", obj, newname);
  }

  changeObjectSchema(obj, newschema) {
    this.putCmd("^execute sp_changeobjectowner '%f', '%s'", obj, newschema);
  }

  dropTable(obj, options = {}) {
    if (options.testIfExists) {
      this.put("IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'%f') AND type in (N'U'))&n", obj);
    }
    super.dropTable(obj, options);
  }

  dropColumn(column) {
    if (column.defaultConstraint) {
      this.putCmd('^alter ^table %f ^drop ^constraint %i', column, column.defaultConstraint);
    }
    super.dropColumn(column);
  }

  dropDefault(col) {
    if (col.defaultConstraint) {
      this.putCmd('^alter ^table %f ^drop ^constraint %i', col, col.defaultConstraint);
    }
  }

  guessDefaultName(col) {
    return col.defaultConstraint || `DF_${col.schemaName || 'dbo'}_${col.pureName}_col.columnName`;
  }

  createDefault(col) {
    if (col.defaultValue == null) return;
    const defsql = col.defaultValue?.toString();
    if (defsql) {
      const defname = this.guessDefaultName(col);
      this.putCmd('^alter ^table %f ^add ^constraint %i ^default %s for %i', col, defname, defsql, col.columnName);
    }
  }

  renameColumn(column, newcol) {
    this.putCmd("^execute sp_rename '%f.%i', '%s', 'COLUMN'", column, column.columnName, newcol);
  }

  changeColumn(oldcol, newcol, constraints) {
    if (testEqualColumns(oldcol, newcol, false, false)) {
      this.dropDefault(oldcol);
      if (oldcol.columnName != newcol.columnName) this.renameColumn(oldcol, newcol.columnName);
      this.createDefault(newcol);
    } else {
      this.dropDefault(oldcol);
      if (oldcol.columnName != newcol.columnName) this.renameColumn(oldcol, newcol.columnName);
      if (!oldcol.notNull) {
        this.fillNewNotNullDefaults(newcol);
      }
      this.put('^alter ^table %f ^alter ^column %i ', oldcol, oldcol.columnName, newcol.columnName);
      this.columnDefinition(newcol, { includeDefault: false });
      this.endCommand();
      this.createDefault(newcol);
    }
  }

  specialColumnOptions(column) {
    if (column.isSparse) {
      this.put('^sparse ');
    }
  }

  renameConstraint(cnt, newname) {
    if (cnt.constraintType == 'index')
      this.putCmd("^execute sp_rename '%f.%i', '%s', 'INDEX'", cnt, cnt.constraintName, newname);
    else
      this.putCmd(
        "^execute sp_rename '%f', '%s', 'OBJECT'",
        { schemaName: cnt.schemaName, pureName: cnt.constraintName },
        newname
      );
  }

  selectScopeIdentity() {
    this.put('^select ^scope_identity()');
  }

  callableTemplate(func) {
    const putParameters = (parameters, delimiter) => {
      this.putCollection(delimiter, parameters || [], param => {
        this.putRaw(param.parameterName);
        if (param?.parameterMode == 'OUT') this.put(' ^output');
      });
    };
    const putDeclareParameters = parameters => {
      for (const param of parameters || []) {
        this.put('^declare %s %s', param.parameterName, param.dataType);
        if (param.parameterMode == 'IN') {
          this.put(' = :%s', param.parameterName.substring(1));
        }
        this.endCommand();
      }
    };

    if (func.objectTypeField == 'procedures') {
      putDeclareParameters(func.parameters);
      this.put('^execute %f&>&n', func);
      putParameters(func.parameters, ',&n');
      this.put('&<&n');
      this.endCommand();
    }

    if (func.objectTypeField == 'functions') {
      const pars = (func.parameters || []).filter(x => x.parameterMode != 'OUT');
      putDeclareParameters(pars);
      this.put('^select %f(', func);
      putParameters(pars, ', ');
      this.put(')');
      this.endCommand();
    }
  }
}

MsSqlDumper.prototype.renameView = MsSqlDumper.prototype.renameObject;
MsSqlDumper.prototype.changeViewSchema = MsSqlDumper.prototype.changeObjectSchema;

MsSqlDumper.prototype.renameProcedure = MsSqlDumper.prototype.renameObject;
MsSqlDumper.prototype.changeProcedureSchema = MsSqlDumper.prototype.changeObjectSchema;

MsSqlDumper.prototype.renameFunction = MsSqlDumper.prototype.renameObject;
MsSqlDumper.prototype.changeFunctionSchema = MsSqlDumper.prototype.changeObjectSchema;

MsSqlDumper.prototype.renameTrigger = MsSqlDumper.prototype.renameObject;
MsSqlDumper.prototype.changeTriggerSchema = MsSqlDumper.prototype.changeObjectSchema;

MsSqlDumper.prototype.renameTable = MsSqlDumper.prototype.renameObject;
MsSqlDumper.prototype.changeTableSchema = MsSqlDumper.prototype.changeObjectSchema;
MsSqlDumper.prototype.renameSqlObject = MsSqlDumper.prototype.renameObject;

module.exports = MsSqlDumper;
