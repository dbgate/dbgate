const { DatabaseAnalyser } = require('dbgate-tools');

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  async _runAnalysis() {
    const tables = await this.driver.query(this.pool, "select * from sqlite_master where type='table'");
    console.log('tables', tables);

    const res = this.mergeAnalyseResult(
      {
        tables: tables.rows.map((x) => ({
          pureName: x.name,
          objectId: x.name,
        })),
      },
      (x) => x.pureName
    );
    // console.log('MERGED', res);
    return res;
  }
}

module.exports = Analyser;
