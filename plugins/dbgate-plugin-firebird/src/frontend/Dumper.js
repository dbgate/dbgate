const { SqlDumper } = global.DBGATE_PACKAGES['dbgate-tools'];

class Dumper extends SqlDumper {
  autoIncrement() {
    this.put(' ^generated ^by ^default ^as ^identity');
  }
}

module.exports = Dumper;
