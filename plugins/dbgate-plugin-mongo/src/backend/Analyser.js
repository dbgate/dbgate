const { DatabaseAnalyser } = global.DBGATE_PACKAGES['dbgate-tools'];

class Analyser extends DatabaseAnalyser {
  constructor(dbhan, driver, version) {
    super(dbhan, driver, version);
  }

  async _runAnalysis() {
    const collectionsAndViews = await this.dbhan.getDatabase().listCollections().toArray();
    const collections = collectionsAndViews.filter((x) => x.type == 'collection');
    const views = collectionsAndViews.filter((x) => x.type == 'view');

    let stats;
    try {
      stats = await Promise.all(
        collections
          .filter((x) => x.type == 'collection')
          .map((x) =>
            this.dbhan
              .getDatabase()
              .collection(x.name)
              .aggregate([{ $collStats: { count: {} } }])
              .toArray()
              .then((resp) => ({ name: x.name, count: resp[0].count }))
          )
      );
    } catch (e) {
      // $collStats not supported
      stats = {};
    }

    const res = this.mergeAnalyseResult({
      collections: [
        ...collections.map((x, index) => ({
          pureName: x.name,
          tableRowCount: stats[index]?.count,
          uniqueKey: [{ columnName: '_id' }],
          partitionKey: [{ columnName: '_id' }],
          clusterKey: [{ columnName: '_id' }],
        })),
        ...views.map((x, index) => ({
          pureName: x.name,
          uniqueKey: [{ columnName: '_id' }],
          partitionKey: [{ columnName: '_id' }],
          clusterKey: [{ columnName: '_id' }],
        })),
      ],
    });
    // console.log('MERGED', res);
    return res;
  }
}

module.exports = Analyser;
