import { SqlDumper } from './SqlDumper';

const dialect = {
  limitSelect: true,
  rangeSelect: true,
  offsetFetchRangeSyntax: true,
  stringEscapeChar: "'",
  fallbackDataType: 'nvarchar(max)',
  quoteIdentifier(s) {
    return s;
  },
};

export const driverBase = {
  analyserClass: null,
  dumperClass: SqlDumper,
  dialect,

  async analyseFull(pool) {
    const analyser = new this.analyserClass(pool, this);
    return analyser.fullAnalysis();
  },
  async analyseSingleObject(pool, name, typeField = 'tables') {
    const analyser = new this.analyserClass(pool, this);
    return analyser.singleObjectAnalysis(name, typeField);
  },
  analyseSingleTable(pool, name) {
    return this.analyseSingleObject(pool, name, 'tables');
  },
  async analyseIncremental(pool, structure) {
    const analyser = new this.analyserClass(pool, this);
    return analyser.incrementalAnalysis(structure);
  },
  createDumper() {
    return new this.dumperClass(this);
  },
};
