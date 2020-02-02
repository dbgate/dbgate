
/** @return {import('dbgate').EngineDriver} */
function getDriver(connection) {
  const { engine } = connection;
  return require(`./${engine}`);
}
module.exports = getDriver;
