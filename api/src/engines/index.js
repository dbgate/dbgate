
/** @return {import('@dbgate/lib').EngineDriver} */
function getDriver(connection) {
  const { engine } = connection;
  return require(`./${engine}`);
}
module.exports = getDriver;
