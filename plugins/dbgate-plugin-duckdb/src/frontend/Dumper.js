const { SqlDumper, arrayToHexString } = require('dbgate-tools');

class Dumper extends SqlDumper {
  autoIncrement() {}

  renameSqlObject(obj, newname) {
    this.putCmd('^alter %k %f ^rename ^to %i', this.getSqlObjectSqlName(obj.objectTypeField), obj, newname);
  }

  renameTable(obj, newname) {
    this.putCmd('^alter ^table %f ^rename ^to %i', obj, newname);
  }
}

module.exports = Dumper;
