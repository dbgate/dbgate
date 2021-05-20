const SqlDumper = require('dbgate-tools/lib/SqlDumper');

class MsSqlDumper extends SqlDumper {
  autoIncrement() {
    this.put(' ^identity');
  }

  putStringValue(value) {
    if (/[^\u0000-\u00ff]/.test(value)) {
      this.putRaw('N');
    }
    super.putStringValue(value);
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
          "^^convert(^varchar(100), ^datepart(^year, %c)) + '-' + ^right('0' + ^convert(^varchar(100), ^datepart(^month, %c)), 2)+'-' + ^right('0' + ^convert(^varchar(100), ^datepart(^day, %c)), 2)",
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

  dropDefault(col) {
    if (col.defaultConstraint) {
      this.putCmd('^alter ^table %f ^drop ^constraint %i', col, col.defaultConstraint);
    }
  }

  guessDefaultName(col) {
    return col.defaultConstraint || `DF${col.schemaName || 'dbo'}_${col.pureName}_col.columnName`;
  }

  createDefault(col) {
    if (!col.defaultValue) return;
    const defsql = col.defaultValue;
    if (!defsql) {
      const defname = this.guessDefaultName(col);
      this.putCmd('^alter ^table %f ^add ^constraint %i ^default %s for %i', col, defname, defsql, col.columnName);
    }
  }

  renameColumn(column, newcol) {
    this.putCmd("^execute sp_rename '%f.%i', '%s', 'COLUMN'", column, column.columnName, newcol);
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

module.exports = MsSqlDumper;
