const { SqlDumper, arrayToHexString } = require('dbgate-tools');

class Dumper extends SqlDumper {
  autoIncrement() {}

  renameSqlObject(obj, newname) {
    this.putCmd('^alter %k %f ^rename ^to %i', this.getSqlObjectSqlName(obj.objectTypeField), obj, newname);
  }
}

module.exports = Dumper;
