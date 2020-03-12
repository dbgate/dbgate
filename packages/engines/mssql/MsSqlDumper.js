const SqlDumper = require('../default/SqlDumper');

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
}

module.exports = MsSqlDumper;
