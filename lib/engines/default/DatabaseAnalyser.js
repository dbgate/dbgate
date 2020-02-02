class DatabaseAnalyser {
  /**
   *
   * @param {import('dbgate').EngineDriver} driver
   */
  constructor(pool, driver) {
    this.pool = pool;
    this.driver = driver;
    this.result = DatabaseAnalyser.createEmptyStructure();
  }
  async runAnalysis() {}
}

/** @returns {import('dbgate').DatabaseInfo} */
DatabaseAnalyser.createEmptyStructure = () => ({
  tables: [],
});

module.exports = DatabaseAnalyser;
