const { DatabaseAnalyser } = require('dbgate-tools');

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver, version) {
    super(pool, driver, version);
  }

  async _runAnalysis() {
    const collections = await this.pool.__getDatabase().listCollections().toArray();

    const res = this.mergeAnalyseResult({
      collections: collections.map((x) => ({
        pureName: x.name,
      })),
    });
    // console.log('MERGED', res);
    return res;
  }
}

module.exports = Analyser;
