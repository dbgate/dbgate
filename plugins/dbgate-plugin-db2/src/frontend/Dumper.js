/** @type {import('dbgate-types').SqlDumper} */
const { SqlDumper } = global.DBGATE_PACKAGES['dbgate-tools'];

class Db2Dumper extends SqlDumper {
  constructor(dbOptions) {
    super(dbOptions);
  }

  endCreateTable(options) {
    if (options && options.foreignKeys && options.foreignKeys.length > 0) {
      this.put('\n');
      
      let isFirst = true;
      for (const fk of options.foreignKeys) {
        if (!isFirst) this.put(',\n');
        isFirst = false;
        this.put('^constraint %f foreign key (%,i) references %f.%f (%,i)', 
          fk.constraintName, 
          fk.columns, 
          fk.refSchemaName, 
          fk.refTableName, 
          fk.refColumns);
      }
    }
    this.put(';\n\n');
  }
}

module.exports = Db2Dumper;