const { DatabaseAnalyser } = require('dbgate-tools');

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver, version) {
    super(pool, driver, version);
  }

  async _runAnalysis() {
    const collections = await this.pool.__getDatabase().listCollections().toArray();

    const stats = await Promise.all(collections.map((x) => this.pool.__getDatabase().collection(x.name).stats()));

    const res = this.mergeAnalyseResult({
      collections: collections.map((x, index) => ({
        pureName: x.name,
        tableRowCount: stats[index].count,
      })),
    });
    // console.log('MERGED', res);
    return res;
  }
}

module.exports = Analyser;
