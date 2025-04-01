const { SqlDumper, arrayToHexString } = require('dbgate-tools');

class Dumper extends SqlDumper {
  autoIncrement() {}
}

module.exports = Dumper;
