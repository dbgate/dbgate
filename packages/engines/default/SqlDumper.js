class SqlDumper {
  /** @param driver {import('@dbgate/types').EngineDriver} */
  constructor(driver) {
    this.s = "";
    this.driver = driver;
    this.dialect = driver.dialect;
    this.indentLevel = 0;
  }
  endCommand() {
    this.putRaw(";\n");
  }
  putRaw(text) {
    this.s += text;
  }
  putCmd(format, ...args) {
    this.put(format, ...args);
    this.endCommand();
  }
  putFormattedValue(c, value) {
    switch (c) {
      case "s":
        if (value != null) {
          this.putRaw(value.toString());
        }
        break;
      case "i":
        {
          this.putRaw(this.dialect.quoteIdentifier(value));
        }
        break;
      case "f":
        {
          const { schemaName, pureName } = value;
          if (schemaName) {
            this.putRaw(this.dialect.quoteIdentifier(schemaName));
            this.putRaw(".");
          }
          this.putRaw(this.dialect.quoteIdentifier(pureName));
        }
        break;
    }
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
        case "^":
          while (i < length && format[i].match(/[a-z0-9_]/i)) {
            this.putRaw(format[i].toUpperCase());
            i++;
          }
          break;
        case "%":
          c = format[i];
          i++;
          this.putFormattedValue(c, args[argIndex]);
          argIndex++;
          break;
        case "&":
          c = format[i];
          i++;
          switch (c) {
            case "&":
              this.putRaw("&");
              break;
            case ">":
              this.indentLevel++;
              break;
            case "<":
              this.indentLevel--;
              break;
            case "n":
              this.putRaw("\n");
              this.putRaw(" ".repeat(2 * this.indentLevel));
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
    this.put(" ^auto_increment");
  }

  /**
   * @param column {import('@dbgate/types').ColumnInfo}
   */
  columnDefinition(
    column,
    {
      includeDefault = true,
      includeNullable = true,
      includeCollate = true
    } = {}
  ) {
    if (column.computedExpression) {
      this.put("^as %s", column.computedExpression);
      if (column.isPersisted) this.put(" ^persisted");
      return;
    }
    this.put("%k", column.dataType);
    if (column.autoIncrement) {
      this.autoIncrement();
    }

    this.putRaw(" ");
    if (column.isSparse) {
      this.put(" ^sparse ");
    }
    if (includeNullable) {
      this.put(column.notNull ? "^not ^null" : "^null");
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
      this.put(
        " ^constraint %i ^default %s ",
        column.defaultConstraint,
        column.defaultValue
      );
    } else {
      this.put(" ^default %s ", column.defaultValue);
    }
  }

  /**
   * @template T
   * @param {string} delimiter
   * @param {T[]} collection
   * @param {(col: T) => void} lambda
   */
  putCollection(delimiter, collection, lambda) {
    let first = true;
    for (const item of collection) {
      if (!first) this.put(delimiter);
      first = false;
      lambda(item);
    }
  }
  /** @param table {import('@dbgate/types').TableInfo} */
  createTable(table) {
    this.put("^create ^table %f ( &>&n", table);
    this.putCollection(", &n", table.columns, col => {
      this.put("%i", col.columnName);
      this.columnDefinition(col);
    });
    // bool first = true;
    // _primaryKeyWrittenInCreateTable = false;
    // foreach (var col in table.Columns)
    // {
    //     if (!first) Put(", &n");
    //     first = false;
    //     Put("%i ", col.Name);
    //     ColumnDefinition(col, true, true, true);
    // }
    // if (table.PrimaryKey != null && !_primaryKeyWrittenInCreateTable)
    // {
    //     if (!first) Put(", &n");
    //     first = false;
    //     if (table.PrimaryKey.ConstraintName != null)
    //     {
    //         Put("^constraint %i", table.PrimaryKey.ConstraintName);
    //     }
    //     Put(" ^primary ^key (%,i)", table.PrimaryKey.Columns);
    // }
    // foreach (var cnt in table.ForeignKeys)
    // {
    //     if (!first) Put(", &n");
    //     first = false;
    //     CreateForeignKeyCore(cnt);
    // }
    // foreach (var cnt in table.Uniques)
    // {
    //     if (!first) Put(", &n");
    //     first = false;
    //     CreateUniqueCore(cnt);
    // }
    // foreach (var cnt in table.Checks)
    // {
    //     if (!first) Put(", &n");
    //     first = false;
    //     CreateCheckCore(cnt);
    // }
    this.put("&<&n)");
    this.endCommand();
    // foreach (var ix in table.Indexes)
    // {
    //     CreateIndex(ix);
    // }
  }
}

module.exports = SqlDumper;
