const _ = require('lodash');
const moment = require('moment');

class SqlDumper {
  /** @param driver {import('@dbgate/types').EngineDriver} */
  constructor(driver) {
    this.s = '';
    this.driver = driver;
    this.dialect = driver.dialect;
    this.indentLevel = 0;
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
    if (_.isString(value)) this.putStringValue(value);
    if (_.isNumber(value)) this.putRaw(value.toString());
    if (_.isDate(value)) this.putStringValue(moment(value).toISOString());
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
    }
  }
  putFormattedList(c, collection) {
    if (!collection) return;
    this.putCollection(', ', collection, item => this.putFormattedValue(c, item));
  }
  /** @param format {string} */
  put(format, ...args) {
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

  /**
   * @param column {import('@dbgate/types').ColumnInfo}
   */
  columnDefinition(column, { includeDefault = true, includeNullable = true, includeCollate = true } = {}) {
    if (column.computedExpression) {
      this.put('^as %s', column.computedExpression);
      if (column.isPersisted) this.put(' ^persisted');
      return;
    }
    this.put('%k', column.dataType);
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

  /**
   * @param column {import('@dbgate/types').ColumnInfo}
   */
  columnDefault(column) {
    if (column.defaultConstraint != null) {
      this.put(' ^constraint %i ^default %s ', column.defaultConstraint, column.defaultValue);
    } else {
      this.put(' ^default %s ', column.defaultValue);
    }
  }

  /**
   * @template T
   * @param {string} delimiter
   * @param {T[]} collection
   * @param {(col: T) => void} lambda
   */
  putCollection(delimiter, collection, lambda) {
    if (!collection) return;
    let first = true;
    for (const item of collection) {
      if (!first) this.put(delimiter);
      first = false;
      lambda(item);
    }
  }
  /** @param table {import('@dbgate/types').TableInfo} */
  createTable(table) {
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

  /** @param fk {import('@dbgate/types').ForeignKeyInfo} */
  createForeignKeyFore(fk) {
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
}

module.exports = SqlDumper;
