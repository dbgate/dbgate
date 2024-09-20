const { DatabaseAnalyser } = global.DBGATE_PACKAGES['dbgate-tools'];;

class Analyser extends DatabaseAnalyser {
  constructor(dbhan, driver) {
    super(dbhan, driver);
  }
}

module.exports = Analyser;
