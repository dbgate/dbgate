import {
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
} from 'dbgate-types';
import _isString from 'lodash/isString';
import _isNumber from 'lodash/isNumber';
import _isDate from 'lodash/isDate';
import uuidv1 from 'uuid/v1';

export class SqlDumper implements AlterProcessor {
  s = '';
  driver: EngineDriver;
  dialect: SqlDialect;
  indentLevel = 0;

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
  putValue(value) {
    if (value === null) this.putRaw('NULL');
    else if (value === true) this.putRaw('1');
    else if (value === false) this.putRaw('0');
    else if (_isString(value)) this.putStringValue(value);
    else if (_isNumber(value)) this.putRaw(value.toString());
    else if (_isDate(value)) this.putStringValue(new Date(value).toISOString());
    else this.putRaw('NULL');
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
            this.putRaw(value.toUpperCase());
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
          while (i < length && format[i].match(/[a-z0-9_]/i)) {
            this.putRaw(format[i].toUpperCase());
            i++;
          }
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

  columnDefinition(column: ColumnInfo, { includeDefault = true, includeNullable = true, includeCollate = true } = {}) {
    if (column.computedExpression) {
      this.put('^as %s', column.computedExpression);
      if (column.isPersisted) this.put(' ^persisted');
      return;
    }
    this.put('%k', column.dataType || this.dialect.fallbackDataType);
    if (column.autoIncrement) {
      this.autoIncrement();
    }

    this.putRaw(' ');
    if (column.isSparse) {
      this.put(' ^sparse ');
    }
    if (includeNullable) {
      this.put(column.notNull ? '^not ^null' : '^null');
    }
    if (includeDefault && column.defaultValue != null) {
      this.columnDefault(column);
    }
  }

  columnDefault(column: ColumnInfo) {
    if (column.defaultConstraint != null) {
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
    if (table.primaryKey) {
      this.put(',&n');
      if (table.primaryKey.constraintName) {
        this.put('^constraint %i', table.primaryKey.constraintName);
      }
      this.put(
        ' ^primary ^key (%,i)',
        table.primaryKey.columns.map(x => x.columnName)
      );
    }
    if (table.foreignKeys) {
      table.foreignKeys.forEach(fk => {
        this.put(',&n');
        this.createForeignKeyFore(fk);
      });
    }
    // foreach (var cnt in table.Uniques)
    // {
    //     if (!first) this.put(", &n");
    //     first = false;
    //     CreateUniqueCore(cnt);
    // }
    // foreach (var cnt in table.Checks)
    // {
    //     if (!first) this.put(", &n");
    //     first = false;
    //     CreateCheckCore(cnt);
    // }
    this.put('&<&n)');
    this.endCommand();
    // foreach (var ix in table.Indexes)
    // {
    //     CreateIndex(ix);
    // }
  }

  createForeignKeyFore(fk: ForeignKeyInfo) {
    if (fk.constraintName != null) this.put('^constraint %i ', fk.constraintName);
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
    this.put('^alter ^table %f ^add %i ', column, column.columnName);
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

  beginTransaction() {
    this.putCmd('^begin ^transaction');
  }

  commitTransaction() {
    this.putCmd('^commit');
  }

  alterProlog() {}
  alterEpilog() {}

  selectTableIntoNewTable(sourceName: NamedObjectInfo, targetName: NamedObjectInfo) {
    this.putCmd('^select * ^into %f ^from %f', targetName, sourceName);
  }

  truncateTable(name: NamedObjectInfo) {
    this.putCmd('^delete ^from %f', name);
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
    if (oldTable.pairingId != newTable.pairingId) {
      throw new Error('Recreate is not possible: oldTable.paringId != newTable.paringId');
    }
    const tmpTable = `temp_${uuidv1()}`;

    const columnPairs = oldTable.columns
      .map(oldcol => ({
        oldcol,
        newcol: newTable.columns.find(x => x.pairingId == oldcol.pairingId),
      }))
      .filter(x => x.newcol);

    this.dropConstraints(oldTable, true);
    this.renameTable(oldTable, tmpTable);

    this.createTable(newTable);

    const autoinc = newTable.columns.find(x => x.autoIncrement);
    if (autoinc) {
      this.allowIdentityInsert(newTable, true);
    }

    this.putCmd(
      '^insert ^into %f (%,i) select %,s ^from %f',
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
  }
}
