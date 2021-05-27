const requireEngineDriver = require('dbgate-api/src/utility/requireEngineDriver');
const engines = require('./engines');
global.DBGATE_TOOLS = require('dbgate-tools');

async function run() {
  for (const engine of engines) {
    const driver = requireEngineDriver(engine.connection);
    const conn = await driver.connect(engine.connection);
    await driver.query(conn, 'CREATE DATABASE dbtest');
    await driver.close(conn);
  }
}

run();
