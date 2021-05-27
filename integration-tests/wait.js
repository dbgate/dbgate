const requireEngineDriver = require('dbgate-api/src/utility/requireEngineDriver');
const engines = require('./engines');
global.DBGATE_TOOLS = require('dbgate-tools');

async function run() {
  for (const engine of engines) {
    const driver = requireEngineDriver(engine.connection);
    for (;;) {
      try {
        const conn = await driver.connect(engine.connection);
        await driver.getVersion(conn);
        console.log(`Connect to ${engine.label} - OK`);
        await driver.close(conn);
        break;
      } catch (err) {
        console.log(`Waiting for ${engine.label}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
    }
  }
}

run();
