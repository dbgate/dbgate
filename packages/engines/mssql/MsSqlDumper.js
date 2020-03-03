const SqlDumper = require("../default/SqlDumper");

class MsSqlDumper extends SqlDumper {
  autoIncrement() {
    this.put(" ^identity");
  }
}

module.exports = MsSqlDumper;
