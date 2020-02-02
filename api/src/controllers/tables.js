const _ = require('lodash');
const databaseConnections = require('./databaseConnections');

module.exports = {
  tableData_meta: 'get',
  async tableData({ conid, database, schemaName, pureName }) {
    const opened = await databaseConnections.ensureOpened(conid, database);
    const res = await databaseConnections.sendRequest(opened, { msgtype: 'tableData', schemaName, pureName });
    return res;
  },

  tableInfo_meta: 'get',
  async tableInfo({ conid, database, schemaName, pureName }) {
    const opened = await databaseConnections.ensureOpened(conid, database);
    const table = opened.structure.tables.find(x => x.pureName == pureName && x.schemaName == schemaName);
    return table;
  },
};
