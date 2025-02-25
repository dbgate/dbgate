import type {
  ColumnInfo,
  ConstraintInfo,
  EngineDriver,
  ForeignKeyInfo,
  FunctionInfo,
  NamedObjectInfo,
  PrimaryKeyInfo,
  ProcedureInfo,
  SqlDialect,
  TableInfo,
  TransformType,
  TriggerInfo,
  ViewInfo,
  IndexInfo,
  UniqueInfo,
  CheckInfo,
  AlterProcessor,
  SqlObjectInfo,
  CallableObjectInfo,
  SchedulerEventInfo,
} from 'dbgate-types';
import _isString from 'lodash/isString';
import _isNumber from 'lodash/isNumber';
import _isDate from 'lodash/isDate';
import _isArray from 'lodash/isArray';
import _isPlainObject from 'lodash/isPlainObject';
import _keys from 'lodash/keys';
import uuidv1 from 'uuid/v1';

export class SqlDumper implements AlterProcessor {
  s = '';
  driver: EngineDriver;
  dialect: SqlDialect;
  indentLevel = 0;

  static keywordsCase = 'upperCase';
  static convertKeywordCase(keyword: any): string {
    if (this.keywordsCase == 'lowerCase') return keyword?.toString()?.toLowerCase();
    return keyword?.toString()?.toUpperCase();
  }

  constructor(driver: EngineDriver) {
    this.driver = driver;
    this.dialect = driver.dialect;
  }
  endCommand() {
    this.putRaw(';\n');
  }
  putRaw(text) {
    this.s += text;
  }
  escapeString(value) {
    const esc = this.dialect.stringEscapeChar;
    let res = '';
    for (let i = 0; i < value.length; i++) {
      const c = value[i];
      if (c == esc || c == "'") {
        res += esc;
      }
      res += c;
    }
    return res;
  }
  putStringValue(value) {
    this.putRaw("'");
    this.putRaw(this.escapeString(value));
    this.putRaw("'");
  }
  putByteArrayValue(value) {
    this.put('^null');
  }
  putValue(value, dataType = null) {
    if (value === null) this.put('^null');
    else if (value === true) this.putRaw('1');
    else if (value === false) this.putRaw('0');
    else if (_isString(value)) this.putStringValue(value);
    else if (_isNumber(value)) this.putRaw(value.toString());
    else if (_isDate(value)) this.putStringValue(new Date(value).toISOString());
    else if (value?.type == 'Buffer' && _isArray(value?.data)) this.putByteArrayValue(value?.data);
    else if (_isPlainObject(value) || _isArray(value)) this.putStringValue(JSON.stringify(value));
    else this.put('^null');
  }
  putCmd(format, ...args) {
    this.put(format, ...args);
    this.endCommand();
  }
  putFormattedValue(c, value) {
    switch (c) {
      case 's':
        if (value != null) {
          this.putRaw(value.toString());
        }
        break;
      case 'i':
        {
          this.putRaw(this.dialect.quoteIdentifier(value));
        }
        break;
      case 'k':
        {
          if (value) {
            this.putRaw(SqlDumper.convertKeywordCase(value));
          }
        }
        break;
      case 'f':
        {
          const { schemaName, pureName } = value;
          if (schemaName) {
            this.putRaw(this.dialect.quoteIdentifier(schemaName));
            this.putRaw('.');
          }
          this.putRaw(this.dialect.quoteIdentifier(pureName));
        }
        break;
      case 'v':
        this.putValue(value);
        break;
      case 'V':
        this.putValue(value.value, value.dataType);
        break;
      case 'c':
        value(this);
        break;
    }
  }
  putFormattedList(c, collection) {
    if (!collection) return;
    this.putCollection(', ', collection, item => this.putFormattedValue(c, item));
  }
  put(format: string, ...args) {
    let i = 0;
    let argIndex = 0;
    const length = format.length;
    while (i < length) {
      let c = format[i];
      i++;
      switch (c) {
        case '^':
          if (format[i] == '^') {
            this.putRaw('^');
            i++;
            break;
          }

          while (i < length && format[i].match(/[a-z0-9_]/i)) {
            this.putRaw(SqlDumper.convertKeywordCase(format[i]));
            i++;
          }
          break;
        case '~':
          if (format[i] == '~') {
            this.putRaw('~');
            i++;
            break;
          }
          let ident = '';
          while (i < length && format[i].match(/[a-z0-9_]/i)) {
            ident += format[i];
            i++;
          }
          this.putRaw(this.dialect.quoteIdentifier(ident));
          break;
        case '%':
          c = format[i];
          i++;
          switch (c) {
            case '%':
              this.putRaw('%');
              break;
            case ',':
              c = format[i];
              i++;
              this.putFormattedList(c, args[argIndex]);
              break;
            default:
              this.putFormattedValue(c, args[argIndex]);
              break;
          }

          argIndex++;
          break;
        case '&':
          c = format[i];
          i++;
          switch (c) {
            case '&':
              this.putRaw('&');
              break;
            case '>':
              this.indentLevel++;
              break;
            case '<':
              this.indentLevel--;
              break;
            case 'n':
              this.putRaw('\n');
              this.putRaw(' '.repeat(2 * this.indentLevel));
              break;
          }
          break;

        default:
          this.putRaw(c);
          break;
      }
    }
  }
  autoIncrement() {
    this.put(' ^auto_increment');
  }

  createDatabase(name: string) {
    this.putCmd('^create ^database %i', name);
  }

  dropDatabase(name: string) {
    this.putCmd('^drop ^database %i', name);
  }

  createSchema(name: string) {
    this.putCmd('^create ^schema %i', name);
  }

  dropSchema(name: string) {
    this.putCmd('^drop ^schema %i', name);
  }

  specialColumnOptions(column) {}

  selectScopeIdentity(table: TableInfo) {}

  columnType(dataType: string) {
    const type = dataType || this.dialect.fallbackDataType;
    const typeWithValues = type.match(/([^(]+)(\(.+[^)]\))/);

    if (typeWithValues?.length) {
      typeWithValues.shift();
      this.putRaw(SqlDumper.convertKeywordCase(typeWithValues.shift()));
      this.putRaw(typeWithValues);
    } else {
      this.putRaw(SqlDumper.convertKeywordCase(type));
    }
  }

  columnDefinition(column: ColumnInfo, { includeDefault = true, includeNullable = true, includeCollate = true } = {}) {
    if (column.computedExpression) {
      this.put('^as %s', column.computedExpression);
      if (column.isPersisted) this.put(' ^persisted');
      return;
    }

    this.columnType(column.dataType);

    if (column.autoIncrement && !this.dialect?.disableAutoIncrement) {
      this.autoIncrement();
    }

    this.putRaw(' ');
    this.specialColumnOptions(column);

    if (this.dialect?.defaultValueBeforeNullability) {
      if (includeDefault && column.defaultValue?.toString()?.trim()) {
        this.columnDefault(column);
      }
      if (includeNullable && !this.dialect?.specificNullabilityImplementation) {
        this.put(column.notNull ? '^not ^null' : '^null');
      }
    } else {
      if (includeNullable && !this.dialect?.specificNullabilityImplementation) {
        this.put(column.notNull ? '^not ^null' : '^null');
      }
      if (includeDefault && column.defaultValue?.toString()?.trim()) {
        this.columnDefault(column);
      }
    }
  }

  columnDefault(column: ColumnInfo) {
    if (column.defaultConstraint != null && this.dialect?.namedDefaultConstraint) {
      this.put(' ^constraint %i ^default %s ', column.defaultConstraint, column.defaultValue);
    } else {
      this.put(' ^default %s ', column.defaultValue);
    }
  }

  putCollection<T>(delimiter: string, collection: T[], lambda: (col: T) => void) {
    if (!collection) return;
    let first = true;
    for (const item of collection) {
      if (!first) this.put(delimiter);
      first = false;
      lambda(item);
    }
  }

  createTable(table: TableInfo) {
    this.put('^create ^table %f ( &>&n', table);
    this.putCollection(',&n', table.columns, col => {
      this.put('%i ', col.columnName);
      this.columnDefinition(col);
    });
    this.createTablePrimaryKeyCore(table);

    (table.foreignKeys || []).forEach(fk => {
      this.put(',&n');
      this.createForeignKeyFore(fk);
    });
    (table.uniques || []).forEach(uq => {
      this.put(',&n');
      this.createUniqueCore(uq);
    });
    (table.checks || []).forEach(chk => {
      this.put(',&n');
      this.createCheckCore(chk);
    });

    this.put('&<&n)');

    this.tableOptions(table);

    this.endCommand();
    (table.indexes || []).forEach(ix => {
      this.createIndex(ix);
    });
  }

  tableOptions(table: TableInfo) {
    const options = this.driver?.dialect?.getTableFormOptions?.('sqlCreateTable') || [];
    for (const option of options) {
      if (table[option.name]) {
        this.put('&n');
        this.put(option.sqlFormatString, table[option.name]);
      }
    }
  }

  createTablePrimaryKeyCore(table: TableInfo) {
    if (table.primaryKey) {
      this.put(',&n');
      if (table.primaryKey.constraintName && !this.dialect.anonymousPrimaryKey) {
        this.put('^constraint %i', table.primaryKey.constraintName);
      }
      this.put(
        ' ^primary ^key (%,i)',
        table.primaryKey.columns.map(x => x.columnName)
      );
    }
  }

  createForeignKeyFore(fk: ForeignKeyInfo) {
    if (fk.constraintName != null && !this.dialect.anonymousForeignKey) {
      this.put('^constraint %i ', fk.constraintName);
    }
    this.put(
      '^foreign ^key (%,i) ^references %f (%,i)',
      fk.columns.map(x => x.columnName),
      { schemaName: fk.refSchemaName, pureName: fk.refTableName },
      fk.columns.map(x => x.refColumnName)
    );
    if (fk.deleteAction) this.put(' ^on ^delete %k', fk.deleteAction);
    if (fk.updateAction) this.put(' ^on ^update %k', fk.updateAction);
  }

  transform(type: TransformType, dumpExpr) {
    dumpExpr();
  }

  allowIdentityInsert(table: NamedObjectInfo, allow: boolean) {}
  enableConstraints(table: NamedObjectInfo, enabled: boolean) {}
  enableAllForeignKeys(enabled: boolean) {}

  comment(value: string) {
    if (!value) return;
    for (const line of value.split('\n')) {
      this.put(' -- %s', line.trimRight());
    }
  }

  createView(obj: ViewInfo) {
    this.putRaw(obj.createSql);
    this.endCommand();
  }
  dropView(obj: ViewInfo, { testIfExists = false }) {
    this.putCmd('^drop ^view  %f', obj);
  }
  alterView(obj: ViewInfo) {
    this.putRaw(obj.createSql.replace(/create\s+view/i, 'ALTER VIEW'));
    this.endCommand();
  }
  changeViewSchema(obj: ViewInfo, newSchema: string) {}
  renameView(obj: ViewInfo, newSchema: string) {}

  createMatview(obj: ViewInfo) {
    this.putRaw(obj.createSql);
    this.endCommand();
  }
  dropMatview(obj: ViewInfo, { testIfExists = false }) {
    this.putCmd('^drop ^materialized ^view  %f', obj);
  }
  alterMatview(obj: ViewInfo) {
    this.putRaw(obj.createSql.replace(/create\s+view/i, 'ALTER VIEW'));
    this.endCommand();
  }
  changeMatviewSchema(obj: ViewInfo, newSchema: string) {}
  renameMatview(obj: ViewInfo, newSchema: string) {}

  createProcedure(obj: ProcedureInfo) {
    this.putRaw(obj.createSql);
    this.endCommand();
  }
  dropProcedure(obj: ProcedureInfo, { testIfExists = false }) {
    this.putCmd('^drop ^procedure  %f', obj);
  }
  alterProcedure(obj: ProcedureInfo) {
    this.putRaw(obj.createSql.replace(/create\s+procedure/i, 'ALTER PROCEDURE'));
    this.endCommand();
  }
  changeProcedureSchema(obj: ProcedureInfo, newSchema: string) {}
  renameProcedure(obj: ProcedureInfo, newSchema: string) {}

  createFunction(obj: FunctionInfo) {
    this.putRaw(obj.createSql);
    this.endCommand();
  }
  dropFunction(obj: FunctionInfo, { testIfExists = false }) {
    this.putCmd('^drop ^function  %f', obj);
  }
  alterFunction(obj: FunctionInfo) {
    this.putRaw(obj.createSql.replace(/create\s+function/i, 'ALTER FUNCTION'));
    this.endCommand();
  }
  changeFunctionSchema(obj: FunctionInfo, newSchema: string) {}
  renameFunction(obj: FunctionInfo, newSchema: string) {}

  createTrigger(obj: TriggerInfo) {
    this.putRaw(obj.createSql);
    this.endCommand();
  }
  dropTrigger(obj: TriggerInfo, { testIfExists = false }) {
    this.putCmd('^drop ^trigger  %f', obj);
  }
  alterTrigger(obj: TriggerInfo) {
    this.putRaw(obj.createSql.replace(/create\s+trigger/i, 'ALTER TRIGGER'));
    this.endCommand();
  }
  changeTriggerSchema(obj: TriggerInfo, newSchema: string) {}
  renameTrigger(obj: TriggerInfo, newSchema: string) {}

  createSchedulerEvent(obj: SchedulerEventInfo) {
    this.putRaw(obj.createSql);
    this.endCommand();
  }
  dropSchedulerEvent(obj: SchedulerEventInfo, { testIfExists = false }) {
    this.putCmd('^drop ^event  %f', obj);
  }

  dropConstraintCore(cnt: ConstraintInfo) {
    this.putCmd('^alter ^table %f ^drop ^constraint %i', cnt, cnt.constraintName);
  }
  dropConstraint(cnt: ConstraintInfo) {
    switch (cnt.constraintType) {
      case 'primaryKey':
        this.dropPrimaryKey(cnt as PrimaryKeyInfo);
        break;
      case 'foreignKey':
        this.dropForeignKey(cnt as ForeignKeyInfo);
        break;
      case 'unique':
        this.dropUnique(cnt as UniqueInfo);
        break;
      case 'check':
        this.dropCheck(cnt as CheckInfo);
        break;
      case 'index':
        this.dropIndex(cnt as IndexInfo);
        break;
    }
  }
  createConstraint(cnt: ConstraintInfo) {
    switch (cnt.constraintType) {
      case 'primaryKey':
        this.createPrimaryKey(cnt as PrimaryKeyInfo);
        break;
      case 'foreignKey':
        this.createForeignKey(cnt as ForeignKeyInfo);
        break;
      case 'unique':
        this.createUnique(cnt as UniqueInfo);
        break;
      case 'check':
        this.createCheck(cnt as CheckInfo);
        break;
      case 'index':
        this.createIndex(cnt as IndexInfo);
        break;
    }
  }
  changeConstraint(oldConstraint: ConstraintInfo, newConstraint: ConstraintInfo) {}
  dropForeignKey(fk: ForeignKeyInfo) {
    if (this.dialect.explicitDropConstraint) {
      this.putCmd('^alter ^table %f ^drop ^foreign ^key %i', fk, fk.constraintName);
    } else {
      this.dropConstraintCore(fk);
    }
  }
  createForeignKey(fk: ForeignKeyInfo) {
    this.put('^alter ^table %f ^add ', fk);
    this.createForeignKeyFore(fk);
    this.endCommand();
  }
  dropPrimaryKey(pk: PrimaryKeyInfo) {
    if (this.dialect.explicitDropConstraint) {
      this.putCmd('^alter ^table %f ^drop ^primary ^key', pk);
    } else {
      this.dropConstraintCore(pk);
    }
  }
  createPrimaryKey(pk: PrimaryKeyInfo) {
    this.putCmd(
      '^alter ^table %f ^add ^constraint %i ^primary ^key (%,i)',
      pk,
      pk.constraintName,
      pk.columns.map(x => x.columnName)
    );
  }

  dropIndex(ix: IndexInfo) {
    this.put('^drop ^index %i', ix.constraintName);
    if (this.dialect.dropIndexContainsTableSpec) {
      this.put(' ^on %f', ix);
    }
    this.endCommand();
  }
  createIndex(ix: IndexInfo) {
    this.put('^create');
    if (ix.isUnique) this.put(' ^unique');
    this.put(' ^index %i &n^on %f (&>&n', ix.constraintName, ix);
    this.putCollection(',&n', ix.columns, col => {
      this.put('%i %k', col.columnName, col.isDescending == true ? 'DESC' : 'ASC');
    });
    this.put('&<&n)');
    if (ix.filterDefinition && this.dialect.filteredIndexes) {
      this.put('&n^where %s', ix.filterDefinition);
    }
    this.endCommand();
  }

  dropUnique(uq: UniqueInfo) {
    this.dropConstraintCore(uq);
  }
  createUniqueCore(uq: UniqueInfo) {
    this.put(
      '^constraint %i ^unique (%,i)',
      uq.constraintName,
      uq.columns.map(x => x.columnName)
    );
  }

  createUnique(uq: UniqueInfo) {
    this.put('^alter ^table %f ^add ', uq);
    this.createUniqueCore(uq);
    this.endCommand();
  }

  dropCheck(ch: CheckInfo) {
    this.dropConstraintCore(ch);
  }

  createCheckCore(ch: CheckInfo) {
    this.put('^constraint %i ^check (%s)', ch.constraintName, ch.definition);
  }

  createCheck(ch: CheckInfo) {
    this.put('^alter ^table %f ^add ', ch);
    this.createCheckCore(ch);
    this.endCommand();
  }

  renameConstraint(constraint: ConstraintInfo, newName: string) {}

  createColumn(column: ColumnInfo, constraints: ConstraintInfo[]) {
    this.put('^alter ^table %f ^add ', column);
    if (this.dialect.createColumnWithColumnKeyword) this.put('^column ');
    this.put(' %i ', column.columnName);
    this.columnDefinition(column);
    this.inlineConstraints(constraints);
    this.endCommand();
  }

  inlineConstraints(constrains: ConstraintInfo[]) {
    if (constrains == null) return;
    for (const cnt of constrains) {
      if (cnt.constraintType == 'primaryKey') {
        if (cnt.constraintName != null && !this.dialect.anonymousPrimaryKey) {
          this.put(' ^constraint %i', cnt.constraintName);
        }
        this.put(' ^primary ^key ');
      }
    }
  }

  dropColumn(column: ColumnInfo) {
    this.putCmd('^alter ^table %f ^drop ^column %i', column, column.columnName);
  }

  renameColumn(column: ColumnInfo, newName: string) {}

  changeColumn(oldcol: ColumnInfo, newcol: ColumnInfo, constraints: ConstraintInfo[]) {}

  dropTable(obj: TableInfo, { testIfExists = false } = {}) {
    this.putCmd('^drop ^table %f', obj);
  }

  changeTableSchema(obj: TableInfo, schema: string) {}

  renameTable(obj: TableInfo, newname: string) {}

  renameSqlObject(obj: SqlObjectInfo, newname: string) {}

  beginTransaction() {
    this.putCmd('^begin ^transaction');
  }

  commitTransaction() {
    this.putCmd('^commit');
  }

  rollbackTransaction() {
    this.putCmd('^rollback');
  }

  alterProlog() {}
  alterEpilog() {}

  selectTableIntoNewTable(sourceName: NamedObjectInfo, targetName: NamedObjectInfo) {
    this.putCmd('^select * ^into %f ^from %f', targetName, sourceName);
  }

  truncateTable(name: NamedObjectInfo) {
    this.putCmd('^truncate ^table %f', name);
  }

  dropConstraints(table: TableInfo, dropReferences = false) {
    if (dropReferences && this.dialect.dropForeignKey) {
      table.dependencies.forEach(cnt => this.dropConstraint(cnt));
    }
    if (this.dialect.dropIndex) {
      table.indexes.forEach(cnt => this.dropIndex(cnt));
    }
    if (this.dialect.dropForeignKey) {
      table.foreignKeys.forEach(cnt => this.dropForeignKey(cnt));
    }
    if (this.dialect.dropPrimaryKey && table.primaryKey) {
      this.dropPrimaryKey(table.primaryKey);
    }
  }

  recreateTable(oldTable: TableInfo, newTable: TableInfo) {
    if (!oldTable.pairingId || !newTable.pairingId || oldTable.pairingId != newTable.pairingId) {
      throw new Error('Recreate is not possible: oldTable.paringId != newTable.paringId');
    }

    const tmpTable = `temp_${uuidv1()}`;

    const columnPairs = oldTable.columns
      .map(oldcol => ({
        oldcol,
        newcol: newTable.columns.find(x => x.pairingId == oldcol.pairingId),
      }))
      .filter(x => x.newcol);

    if (this.driver.supportsTransactions) {
      this.dropConstraints(oldTable, true);
      this.renameTable(oldTable, tmpTable);

      this.createTable(newTable);

      const autoinc = newTable.columns.find(x => x.autoIncrement);
      if (autoinc) {
        this.allowIdentityInsert(newTable, true);
      }

      this.putCmd(
        '^insert ^into %f (%,i) select %,i ^from %f',
        newTable,
        columnPairs.map(x => x.newcol.columnName),
        columnPairs.map(x => x.oldcol.columnName),
        { ...oldTable, pureName: tmpTable }
      );

      if (autoinc) {
        this.allowIdentityInsert(newTable, false);
      }

      if (this.dialect.dropForeignKey) {
        newTable.dependencies.forEach(cnt => this.createConstraint(cnt));
      }

      this.dropTable({ ...oldTable, pureName: tmpTable });
    } else {
      // we have to preserve old table as long as possible
      this.createTable({ ...newTable, pureName: tmpTable });

      this.putCmd(
        '^insert ^into %f (%,i) select %,s ^from %f',
        { ...newTable, pureName: tmpTable },
        columnPairs.map(x => x.newcol.columnName),
        columnPairs.map(x => x.oldcol.columnName),
        oldTable
      );

      this.dropTable(oldTable);
      this.renameTable({ ...newTable, pureName: tmpTable }, newTable.pureName);
    }
  }

  createSqlObject(obj: SqlObjectInfo) {
    this.putRaw(obj.createSql);
    this.endCommand();
  }

  getSqlObjectSqlName(ojectTypeField: string) {
    switch (ojectTypeField) {
      case 'procedures':
        return 'PROCEDURE';
      case 'views':
        return 'VIEW';
      case 'functions':
        return 'FUNCTION';
      case 'triggers':
        return 'TRIGGER';
      case 'matviews':
        return 'MATERIALIZED VIEW';
      case 'schedulerEvents':
        return 'EVENT';
    }
  }

  dropSqlObject(obj: SqlObjectInfo) {
    this.putCmd('^drop %s %f', this.getSqlObjectSqlName(obj.objectTypeField), obj);
  }

  setTableOption(table: TableInfo, optionName: string, optionValue: string) {
    const options = this?.dialect?.getTableFormOptions?.('sqlAlterTable');
    const option = options?.find(x => x.name == optionName && !x.disabled);
    if (!option) {
      return;
    }

    this.setTableOptionCore(table, optionName, optionValue, option.sqlFormatString);

    this.endCommand();
  }

  setTableOptionCore(table: TableInfo, optionName: string, optionValue: string, formatString: string) {
    this.put('^alter ^table %f ', table);
    this.put(formatString, optionValue);
  }

  fillNewNotNullDefaults(col: ColumnInfo) {
    if (col.notNull && col.defaultValue != null) {
      this.putCmd('^update %f ^set %i = %s ^where %i ^is ^null', col, col.columnName, col.defaultValue, col.columnName);
    }
  }

  fillPreloadedRows(
    table: NamedObjectInfo,
    oldRows: any[],
    newRows: any[],
    key: string[],
    insertOnly: string[],
    autoIncrementColumn: string
  ) {
    let was = false;
    for (const row of newRows) {
      const old = oldRows?.find(r => key.every(col => r[col] == row[col]));
      const rowKeys = _keys(row);
      if (old) {
        const updated = [];
        for (const col of rowKeys) {
          if (row[col] != old[col] && !insertOnly?.includes(col)) {
            updated.push(col);
          }
        }
        if (updated.length > 0) {
          if (was) this.put(';\n');
          was = true;
          this.put('^update %f ^set ', table);
          this.putCollection(', ', updated, col => this.put('%i=%v', col, row[col]));
          this.put(' ^where ');
          this.putCollection(' ^and ', key, col => this.put('%i=%v', col, row[col]));
        }
      } else {
        if (was) this.put(';\n');
        was = true;
        const autoinc = rowKeys.includes(autoIncrementColumn);
        if (autoinc) this.allowIdentityInsert(table, true);
        this.put(
          '^insert ^into %f (%,i) ^values (%,v)',
          table,
          rowKeys,
          rowKeys.map(x => row[x])
        );
        if (autoinc) this.allowIdentityInsert(table, false);
      }
    }
    if (was) {
      this.endCommand();
    }
  }

  callableTemplate(func: CallableObjectInfo) {
    this.put('^call %f(&>&n', func);

    this.putCollection(',&n', func.parameters || [], param => {
      this.putRaw(param.parameterMode == 'IN' ? ':' + param.parameterName : param.parameterName);
    });

    this.put('&<&n)');
    this.endCommand();
  }
}
