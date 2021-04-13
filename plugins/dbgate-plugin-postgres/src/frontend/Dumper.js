const { SqlDumper } = require('dbgate-tools');

class Dumper extends SqlDumper {
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

  dropRecreatedTempTable(tmptable) {
    this.putCmd('^drop ^table %i ^cascade', tmptable);
  }

  renameTable(obj, newname) {
    this.putCmd('^alter ^table %f ^rename ^to %i', obj, newname);
  }

  renameColumn(column, newcol) {
    this.putCmd('^alter ^table %f ^rename ^column %i ^to %i', column, column.columnName, newcol);
  }

  dropTable(obj, options = {}) {
    this.put('^drop ^table');
    if (options.testIfExists) this.put(' ^if ^exists');
    this.put(' %f', obj.FullName);
    this.endCommand();
  }

  //public override void CreateIndex(IndexInfo ix)
  //{
  //}

  enableConstraints(table, enabled) {
    this.putCmd('^alter ^table %f %k ^trigger ^all', table, enabled ? 'enable' : 'disable');
  }

  columnDefinition(col, options) {
    const { autoIncrement } = options || {};
    if (col.autoIncrement) {
      this.put('^serial');
      return;
    }
    super.columnDefinition(col, options);
  }
}

module.exports = Dumper;
