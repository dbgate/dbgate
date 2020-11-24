export const driverBase = {
  analyserClass: null,
  dumperClass: null,

  async analyseFull(pool) {
    const analyser = new this.analyserClass(pool, this);
    return analyser.fullAnalysis();
  },
  async analyseSingleObject(pool, name, typeField = 'tables') {
    const analyser = new this.analyserClass(pool, this);
    analyser.singleObjectFilter = { ...name, typeField };
    const res = await analyser.fullAnalysis();
    return res.tables[0];
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
