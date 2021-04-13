const { DatabaseAnalyser } = require('dbgate-tools');

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver) {
    super(pool, driver);
  }

  async _runAnalysis() {
    const collections = await this.pool.__getDatabase().listCollections().toArray();

    const res = this.mergeAnalyseResult(
      {
        collections: collections.map((x) => ({
          pureName: x.name,
        })),
      },
      (x) => x.pureName
    );
    // console.log('MERGED', res);
    return res;
  }
}

module.exports = Analyser;
