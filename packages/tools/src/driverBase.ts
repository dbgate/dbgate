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
    analyser.singleObjectFilter = { ...name, typeField };
    const res = await analyser.fullAnalysis();
    if (res[typeField].length == 1) return res[typeField][0];
    const obj = res[typeField].find(x => x.pureName == name.pureName && x.schemaName == name.schemaName);
    // console.log('FIND', name, obj);
    return obj;
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
