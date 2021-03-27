const databaseConnections = require('./databaseConnections');
const connections = require('./connections');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { SqlGenerator } = require('dbgate-tools')

module.exports = {
  preview_meta: {
    method: 'post',
  },
  async preview({ conid, database, objects, options }) {
    const structure = await databaseConnections.structure({ conid, database })
    const connection = await connections.get({ conid })
    const driver = requireEngineDriver(connection);
    const dmp = driver.createDumper()
    const generator = new SqlGenerator(structure, options, objects, dmp);
    generator.dump();
    return dmp.s;
  },
};
