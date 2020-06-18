const _ = require('lodash');
const fp = require('lodash/fp');

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
    this.singleObjectFilter = null;
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
  schemas: [],
});

DatabaseAnalyser.byTableFilter = (table) => (x) => x.pureName == table.pureName && x.schemaName == x.schemaName;

DatabaseAnalyser.extractPrimaryKeys = (table, pkColumns) => {
  const filtered = pkColumns.filter(DatabaseAnalyser.byTableFilter(table));
  if (filtered.length == 0) return undefined;
  return {
    ..._.pick(filtered[0], ['constraintName', 'schemaName', 'pureName']),
    constraintType: 'primaryKey',
    columns: filtered.map(fp.pick('columnName')),
  };
};

DatabaseAnalyser.extractForeignKeys = (table, fkColumns) => {
  const grouped = _.groupBy(fkColumns.filter(DatabaseAnalyser.byTableFilter(table)), 'constraintName');
  return _.keys(grouped).map((constraintName) => ({
    constraintName,
    constraintType: 'foreignKey',
    ..._.pick(grouped[constraintName][0], [
      'constraintName',
      'schemaName',
      'pureName',
      'refSchemaName',
      'refTableName',
      'updateAction',
      'deleteAction',
    ]),
    columns: grouped[constraintName].map(fp.pick(['columnName', 'refColumnName'])),
  }));
};

module.exports = DatabaseAnalyser;
