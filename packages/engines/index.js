
/** @return {import('@dbgate/types').EngineDriver} */
function getDriver(connection) {
  const { engine } = connection;
  return require(`./${engine}`);
}
module.exports = getDriver;
