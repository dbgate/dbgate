const _ = require('lodash');
const databaseConnections = require('./databaseConnections');

module.exports = {
  tableData_meta: 'get',
  async tableData({ id, database, schemaName, pureName }) {
    const opened = await databaseConnections.ensureOpened(id, database);
    const res = opened.sendRequest({ msgtype: 'tableData', schemaName, pureName });
    return res;
  },
};
