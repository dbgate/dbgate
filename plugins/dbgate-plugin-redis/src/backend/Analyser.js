const { DatabaseAnalyser } = global.DBGATE_PACKAGES['dbgate-tools'];;

class Analyser extends DatabaseAnalyser {
  constructor(pool, driver) {
    super(pool, driver);
  }
}

module.exports = Analyser;
