const connectProcess = require('./connectProcess');
const databaseConnectionProcess = require('./databaseConnectionProcess');
const serverConnectionProcess = require('./serverConnectionProcess');
const sessionProcess = require('./sessionProcess');
const jslDatastoreProcess = require('./jslDatastoreProcess');
const sshForwardProcess = require('./sshForwardProcess');

module.exports = {
  connectProcess,
  databaseConnectionProcess,
  serverConnectionProcess,
  sessionProcess,
  jslDatastoreProcess,
  sshForwardProcess,
};
