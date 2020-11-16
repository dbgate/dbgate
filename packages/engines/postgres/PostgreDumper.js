const SqlDumper = require('../default/SqlDumper');

class PostgreDumper extends SqlDumper {
  /** @param type {import('dbgate-types').TransformType} */
  transform(type, dumpExpr) {
    switch (type) {
      case 'GROUP:YEAR':
      case 'YEAR':
        this.put('^extract(^year ^from %c)', dumpExpr);
        break;
      case 'MONTH':
        this.put('^extract(^month ^from %c)', dumpExpr);
        break;
      case 'DAY':
        this.put('^extract(^day ^from %c)', dumpExpr);
        break;
      case 'GROUP:MONTH':
        this.put("^to_char(%c, '%s')", dumpExpr, 'YYYY-MM');
        break;
      case 'GROUP:DAY':
        this.put("^to_char(%c, '%s')", dumpExpr, 'YYYY-MM-DD');
        break;
      default:
        dumpExpr();
        break;
    }
  }
}

module.exports = PostgreDumper;
