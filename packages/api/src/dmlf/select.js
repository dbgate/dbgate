const Command = require('./command');

class Select extends Command {
  constructor() {
    super();
    /** @type {number} */
    this.topRecords = undefined;
    /** @type {import('dbgate').NamedObjectInfo} */
    this.from = undefined;
    /** @type {import('dbgate').RangeDefinition} */
    this.range = undefined;
    this.distinct = false;
    this.selectAll = false;
  }

  /** @param dumper {import('dbgate').SqlDumper}  */
  dumpSql(dumper) {
    dumper.put('^select ');
    if (this.topRecords) {
      dumper.put('^top %s ', this.topRecords);
    }
    if (this.distinct) {
      dumper.put('^distinct ');
    }
    if (this.selectAll) {
      dumper.put('* ');
    } else {
      // TODO
    }
    dumper.put('^from %f ', this.from);
    if (this.range) {
      dumper.put('^limit %s ^offset %s ', this.range.limit, this.range.offset);
    }
  }
}

module.exports = Select;
