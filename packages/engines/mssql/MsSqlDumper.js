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

  allowIdentityInsert(table, allow) {
    this.putCmd("^set ^identity_insert %f %k;&n", table, allow ? "on" : "off");
  }
}

module.exports = MsSqlDumper;
