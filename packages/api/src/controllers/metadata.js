const _ = require('lodash');
const fp = require('lodash/fp');
const databaseConnections = require('./databaseConnections');

function pickObjectNames(array) {
  return _.sortBy(array, x => `${x.schemaName}.${x.pureName}`).map(fp.pick(['pureName', 'schemaName']));
}

module.exports = {
  // tableData_meta: true,
  // async tableData({ conid, database, schemaName, pureName }) {
  //   const opened = await databaseConnections.ensureOpened(conid, database);
  //   const res = await databaseConnections.sendRequest(opened, { msgtype: 'tableData', schemaName, pureName });
  //   return res;
  // },

  listObjects_meta: true,
  async listObjects({ conid, database }) {
    const opened = await databaseConnections.ensureOpened(conid, database);
    const types = ['tables', 'collections', 'views', 'procedures', 'functions', 'triggers'];
    return types.reduce(
      (res, type) => ({
        ...res,
        [type]: pickObjectNames(opened.structure[type]),
      }),
      {}
    );
  },

  tableInfo_meta: true,
  async tableInfo({ conid, database, schemaName, pureName }) {
    const opened = await databaseConnections.ensureOpened(conid, database);
    const table = opened.structure.tables.find(x => x.pureName == pureName && x.schemaName == schemaName);
    const allForeignKeys = _.flatten(opened.structure.tables.map(x => x.foreignKeys));
    return {
      ...table,
      dependencies: allForeignKeys.filter(x => x.refSchemaName == schemaName && x.refTableName == pureName),
    };
  },

  sqlObjectInfo_meta: true,
  async sqlObjectInfo({ objectTypeField, conid, database, schemaName, pureName }) {
    const opened = await databaseConnections.ensureOpened(conid, database);
    const res = opened.structure[objectTypeField].find(x => x.pureName == pureName && x.schemaName == schemaName);
    return res;
  },
};
