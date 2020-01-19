class DatabaseAnalyser {
  /**
   *
   * @param {import('../../types').EngineDriver} driver
   */
  constructor(pool, driver) {
    this.pool = pool;
    this.driver = driver;
    this.result = DatabaseAnalyser.createEmptyStructure();
  }
  async runAnalysis() {}
}

/** @returns {import('../../types').DatabaseInfo} */
DatabaseAnalyser.createEmptyStructure = () => ({
  tables: [],
});

module.exports = DatabaseAnalyser;
