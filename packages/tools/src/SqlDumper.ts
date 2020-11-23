import {
  ColumnInfo,
  EngineDriver,
  ForeignKeyInfo,
  NamedObjectInfo,
  SqlDialect,
  TableInfo,
  TransformType,
} from 'dbgate-types';
import _ from 'lodash';
import moment from 'moment';

export class SqlDumper {
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
    if (value === true) this.putRaw('1');
    if (value === false) this.putRaw('0');
    else if (_.isString(value)) this.putStringValue(value);
    else if (_.isNumber(value)) this.putRaw(value.toString());
    else if (_.isDate(value)) this.putStringValue(moment(value).toISOString());
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
    this.putCollection(', ', collection, (item) => this.putFormattedValue(c, item));
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
    this.putCollection(',&n', table.columns, (col) => {
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
        table.primaryKey.columns.map((x) => x.columnName)
      );
    }
    if (table.foreignKeys) {
      table.foreignKeys.forEach((fk) => {
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
      fk.columns.map((x) => x.columnName),
      { schemaName: fk.refSchemaName, pureName: fk.refTableName },
      fk.columns.map((x) => x.refColumnName)
    );
    if (fk.deleteAction) this.put(' ^on ^delete %k', fk.deleteAction);
    if (fk.updateAction) this.put(' ^on ^update %k', fk.updateAction);
  }

  transform(type: TransformType, dumpExpr) {
    dumpExpr();
  }

  allowIdentityInsert(table: NamedObjectInfo, allow: boolean) {}
}
