const connectProcess = require('./connectProcess');
const databaseConnectionProcess = require('./databaseConnectionProcess');
const serverConnectionProcess = require('./serverConnectionProcess');
const restConnectionProcess = require('./restConnectionProcess');
const sessionProcess = require('./sessionProcess');
const jslDatastoreProcess = require('./jslDatastoreProcess');
const sshForwardProcess = require('./sshForwardProcess');

module.exports = {
  connectProcess,
  databaseConnectionProcess,
  serverConnectionProcess,
  restConnectionProcess,
  sessionProcess,
  jslDatastoreProcess,
  sshForwardProcess,
};
