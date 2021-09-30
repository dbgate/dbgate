import { SqlDumper } from './SqlDumper';
import { splitQuery } from 'dbgate-query-splitter';

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

  async analyseFull(pool, version) {
    const analyser = new this.analyserClass(pool, this, version);
    return analyser.fullAnalysis();
  },
  async analyseSingleObject(pool, name, typeField = 'tables') {
    const analyser = new this.analyserClass(pool, this);
    return analyser.singleObjectAnalysis(name, typeField);
  },
  analyseSingleTable(pool, name) {
    return this.analyseSingleObject(pool, name, 'tables');
  },
  async analyseIncremental(pool, structure, version) {
    const analyser = new this.analyserClass(pool, this, version);
    return analyser.incrementalAnalysis(structure);
  },
  createDumper() {
    return new this.dumperClass(this);
  },
  async script(pool, sql) {
    for (const sqlItem of splitQuery(sql, this.getQuerySplitterOptions('script'))) {
      await this.query(pool, sqlItem, { discardResult: true });
    }
  },
};
