const requireEngineDriver = require('dbgate-api/src/utility/requireEngineDriver');
const engines = require('./engines');
global.DBGATE_PACKAGES = {
  'dbgate-tools': require('dbgate-tools'),
  'dbgate-sqltree': require('dbgate-sqltree'),
};

async function connectEngine(engine) {
  const { connection } = engine;
  const driver = requireEngineDriver(connection);
  for (;;) {
    try {
      const conn = await driver.connect(connection);
      await driver.getVersion(conn);
      console.log(`Connect to ${engine.label} - OK`);
      await driver.close(conn);
      return;
    } catch (err) {
      console.log(`Waiting for ${engine.label}, error: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 2500));
      continue;
    }
  }
}

async function run() {
  await new Promise(resolve => setTimeout(resolve, 10000));
  await Promise.all(engines.map(engine => connectEngine(engine)));
}

run();
