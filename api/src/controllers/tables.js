const _ = require('lodash');
const databaseConnections = require('./databaseConnections');

module.exports = {
  tableData_meta: 'get',
  async tableData({ conid, database, schemaName, pureName }) {
    const opened = await databaseConnections.ensureOpened(conid, database);
    const res = await databaseConnections.sendRequest(opened, { msgtype: 'tableData', schemaName, pureName });
    return res;
  },
};
