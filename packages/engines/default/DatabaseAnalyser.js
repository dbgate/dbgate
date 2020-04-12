const _ = require('lodash');

class DatabaseAnalyser {
  /**
   *
   * @param {import('@dbgate/types').EngineDriver} driver
   */
  constructor(pool, driver) {
    this.pool = pool;
    this.driver = driver;
    // this.result = DatabaseAnalyser.createEmptyStructure();
    /** @type {import('@dbgate/types').DatabaseInfo} */
    this.structure = null;
    /** import('@dbgate/types').DatabaseModification[]) */
    this.modifications = null;
  }

  async _runAnalysis() {
    return DatabaseAnalyser.createEmptyStructure();
  }

  /** @returns {Promise<import('@dbgate/types').DatabaseModification[]>} */
  async getModifications() {
    if (this.structure == null) throw new Error('DatabaseAnalyse.getModifications - structure must be filled');

    return null;
  }

  async fullAnalysis() {
    return this._runAnalysis();
  }

  async incrementalAnalysis(structure) {
    this.structure = structure;

    this.modifications = await this.getModifications();
    if (this.modifications == null) {
      // modifications not implemented, perform full analysis
      this.structure = null;
      return this._runAnalysis();
    }
    if (this.modifications.length == 0) return null;
    console.log('DB modifications detected:', this.modifications);
    return this._runAnalysis();
  }

  mergeAnalyseResult(newlyAnalysed) {
    if (this.structure == null) {
      return {
        ...DatabaseAnalyser.createEmptyStructure(),
        ...newlyAnalysed,
      };
    }

    const res = {};
    for (const field of ['tables', 'views', 'functions', 'procedures', 'triggers']) {
      const removedIds = this.modifications
        .filter((x) => x.action == 'remove' && x.objectTypeField == field)
        .map((x) => x.objectId);
      const newArray = newlyAnalysed[field] || [];
      const addedChangedIds = newArray.map((x) => x.objectId);
      const removeAllIds = [...removedIds, ...addedChangedIds];
      res[field] = _.sortBy(
        [...this.structure[field].filter((x) => !removeAllIds.includes(x.objectId)), ...newArray],
        (x) => x.pureName
      );
    }

    return res;

    // const {tables,views, functions, procedures, triggers} = this.structure;

    // return {
    //   tables:
    // }
  }

  // findObjectById(id) {
  //   return this.structure.tables.find((x) => x.objectId == id);
  // }
}

/** @returns {import('@dbgate/types').DatabaseInfo} */
DatabaseAnalyser.createEmptyStructure = () => ({
  tables: [],
  views: [],
  functions: [],
  procedures: [],
  triggers: [],
});

module.exports = DatabaseAnalyser;
