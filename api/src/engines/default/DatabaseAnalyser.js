
class DatabaseAnalyser {
  /**
   *
   * @param {import('../default/types').EngineDriver} driver
   */
  constructor(pool, driver) {
    this.pool = pool;
    this.driver = driver;
  }
  runAnalysis() {}
}

module.exports = DatabaseAnalyser;
