class DatabaseAnalyser {
  /**
   *
   * @param {import('@dbgate/types').EngineDriver} driver
   */
  constructor(pool, driver) {
    this.pool = pool;
    this.driver = driver;
    this.result = DatabaseAnalyser.createEmptyStructure();
  }
  async runAnalysis() {}
}

/** @returns {import('@dbgate/types').DatabaseInfo} */
DatabaseAnalyser.createEmptyStructure = () => ({
  tables: [],
});

module.exports = DatabaseAnalyser;
