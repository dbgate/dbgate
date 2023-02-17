const stream = require('stream');
const path = require('path');
const { quoteFullName, fullNameToString, getLogger } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const connectUtility = require('../utility/connectUtility');
const logger = getLogger('dataDuplicator');
const { DataDuplicator } = require('dbgate-datalib');
const copyStream = require('./copyStream');
const jsonLinesReader = require('./jsonLinesReader');
const { resolveArchiveFolder } = require('../utility/directories');

async function dataDuplicator({
  connection,
  archive,
  items,
  options,
  analysedStructure = null,
  driver,
  systemConnection,
}) {
  if (!driver) driver = requireEngineDriver(connection);
  const pool = systemConnection || (await connectUtility(driver, connection, 'write'));

  logger.info(`Connected.`);

  if (!analysedStructure) {
    analysedStructure = await driver.analyseFull(pool);
  }

  const dupl = new DataDuplicator(
    pool,
    driver,
    analysedStructure,
    items.map(item => ({
      name: item.name,
      operation: item.operation,
      matchColumns: item.matchColumns,
      openStream: () => jsonLinesReader({ fileName: path.join(resolveArchiveFolder(archive), `${item.name}.jsonl`) }),
    })),
    stream,
    copyStream,
    options
  );

  await dupl.run();
}

module.exports = dataDuplicator;
