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

  /**
   * @param {import('dbgate-types').TableInfo} table
   */
  dropTableCommentIfExists(table) {
    const { schemaName, pureName } = table;

    const fullName = `${schemaName && schemaName + '.'}${pureName}`;

    this.put('&>^if ^exists (&n');
    this.put('&>^select 1 ^from sys.extended_properties&n');
    this.put("^where major_id = OBJECT_ID('%s')&n", fullName);
    this.put('^and minor_id = 0&n');
    this.put("^and name = N'MS_Description'&<&<&n");
    this.put(')&n');
    this.put('&>^begin&n');
    this.put('&>^exec sp_dropextendedproperty&n');
    this.put("@name = N'MS_Description',&n");
    this.put("@level0type = N'SCHEMA', @level0name = '%s',&n", schemaName);
    this.put("@level1type = N'TABLE',  @level1name = '%s'&<&n", pureName);
    this.put('^end');
    this.endCommand();
  }

  /**
   * @param {import('dbgate-types').TableInfo} table
   */
  createTableComment(table) {
    const { schemaName, pureName, objectComment } = table;
    if (!objectComment) return;

    this.put('&>^exec sp_addextendedproperty&n');
    this.put("@name = N'MS_Description', @value = N'%s',&n", objectComment);
    this.put("@level0type = N'SCHEMA', @level0name = '%s',&n", schemaName || 'dbo');
    this.put("@level1type = N'TABLE',  @level1name = '%s&<'", pureName);
    this.endCommand();
  }

  /**
   * @param {import('dbgate-types').ColumnInfo} oldcol
   * @param {import('dbgate-types').ColumnInfo} newcol
   */
  changeColumnComment(oldcol, newcol) {
    if (oldcol.columnComment === newcol.columnComment) return;

    if (oldcol.columnComment) this.dropColumnCommentIfExists(newcol);
    if (newcol.columnComment) this.createColumnComment(newcol);
  }

  /**
   * @param {import('dbgate-types').ColumnInfo} column
   */
  dropColumnCommentIfExists(column) {
    const { schemaName, columnName, pureName } = column;
    const fullName = `${schemaName && schemaName + '.'}${pureName}`;

    this.put('&>^if ^exists (&n');
    this.put('&>^select 1 ^from sys.extended_properties&n');
    this.put("^where major_id = OBJECT_ID('%s')&n", fullName);
    this.put(
      "^and minor_id = (^select column_id ^from sys.columns ^where object_id = OBJECT_ID('%s') ^and name = '%s')&n",
      fullName,
      columnName
    );
    this.put("^and name = N'MS_Description'&<&<&n");
    this.put(')&n');
    this.put('&>^begin&n');
    this.put('&>^exec sp_dropextendedproperty&n');
    this.put("@name = N'MS_Description',&n");
    this.put("@level0type = N'SCHEMA', @level0name = '%s',&n", schemaName);
    this.put("@level1type = N'TABLE',  @level1name = '%s',&n", pureName);
    this.put("@level2type = N'COLUMN', @level2name = '%s'&<&n", columnName);
    this.put('^end');
    this.endCommand();
  }

  /**
   * @param {import('dbgate-types').ColumnInfo} column
   */
  createColumnComment(column) {
    const { schemaName, columnName, pureName, columnComment } = column;
    if (!columnComment) return;

    this.put('&>^exec sp_addextendedproperty&n');
    this.put("@name = N'MS_Description', ");
    this.put(`@value = N'%s',&n`, columnComment);
    this.put("@level0type = N'SCHEMA', @level0name = '%s',&n", schemaName);
    this.put("@level1type = N'TABLE',  @level1name = '%s',&n", pureName);
    this.put("@level2type = N'COLUMN', @level2name = '%s&<'", columnName);
    this.endCommand();
  }

  /**
   * @param {import('dbgate-types').TableInfo} table
   */
  createTable(table) {
    super.createTable(table);

    for (const column of table.columns || []) {
      this.createColumnComment(column);
    }
  }

  changeColumn(oldcol, newcol, constraints) {
    if (testEqualColumns(oldcol, newcol, false, false, { ignoreComments: true })) {
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

    this.changeColumnComment(oldcol, newcol);
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

  /**
   * @param {import('dbgate-types').TableInfo} table
   */
  tableOptions(table) {
    this.endCommand();

    const options = this.driver?.dialect?.getTableFormOptions?.('sqlCreateTable') || [];
    for (const option of options) {
      const { name, sqlFormatString } = option;
      const value = table[name];

      if (name == 'objectComment') {
        this.createTableComment(table);
        return;
      }

      if (value) {
        this.put('&n');
        this.put(sqlFormatString, value);
      }
    }
  }

  /**
   * @param {import('dbgate-types').TableInfo} table
   * @param {string} optionName
   * @param {string} optionValue
   */
  setTableOption(table, optionName, optionValue) {
    if (optionName == 'objectComment') {
      this.dropTableCommentIfExists(table);
      if (optionValue) this.createTableComment(table);
      return;
    }

    super.setTableOption(table, optionName, optionValue);
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
