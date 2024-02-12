const { DatabaseAnalyser } = require('dbgate-tools');

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver, version) {
    super(pool, driver, version);
  }

  async _runAnalysis() {
    const collectionsAndViews = await this.pool.__getDatabase().listCollections().toArray();
    const collections = collectionsAndViews.filter((x) => x.type == 'collection');
    const views = collectionsAndViews.filter((x) => x.type == 'view');

    const stats = await Promise.all(
      collections.filter((x) => x.type == 'collection').map((x) => this.pool.__getDatabase().collection(x.name).stats())
    );

    const res = this.mergeAnalyseResult({
      collections: [
        ...collections.map((x, index) => ({
          pureName: x.name,
          tableRowCount: stats[index].count,
        })),
        ...views.map((x, index) => ({
          pureName: x.name,
        })),
      ],
    });
    // console.log('MERGED', res);
    return res;
  }
}

module.exports = Analyser;
