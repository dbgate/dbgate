const { SqlDumper } = require('dbgate-tools');

class Dumper extends SqlDumper {
  setTableOptionCore(table, optionName, optionValue, formatString) {
    this.put('^alter ^table %f ^modify ', table);
    this.put(formatString, optionValue);
  }
}

module.exports = Dumper;
