class SqlDumper {
  /** @param driver {import('dbgate').EngineDriver} */
  constructor(driver) {
    this.s = '';
    this.driver = driver;
    this.dialect = driver.dialect;
  }
  putRaw(text) {
    this.s += text;
  }
  putCmd(text) {
    this.putRaw(text);
    this.putRaw(';\n');
  }
  putFormattedValue(c, value) {
    switch (c) {
      case 's':
        if (value != null) {
          this.putRaw(value.toString());
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
        case '^':
          while (i < length && format[i].match(/[a-z]/i)) {
            this.putRaw(format[i].toUpperCase());
            i++;
          }
          break;
        case '%':
          c = format[i];
          i++;
          this.putFormattedValue(c, args[argIndex]);
          argIndex++;
          break;

        default:
          this.putRaw(c);
          break;
      }
    }
  }
}

module.exports = SqlDumper;
