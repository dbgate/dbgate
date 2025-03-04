const stream = require('stream');
const path = require('path');
const { quoteFullName, fullNameToString, getLogger } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const logger = getLogger('dataDuplicator');
const { DataDuplicator } = require('dbgate-datalib');
const copyStream = require('./copyStream');
const jsonLinesReader = require('./jsonLinesReader');
const { resolveArchiveFolder } = require('../utility/directories');

async function dataDuplicator({
  connection,
  archive,
  folder,
  items,
  options,
  analysedStructure = null,
  driver,
  systemConnection,
}) {
  if (!driver) driver = requireEngineDriver(connection);

  const dbhan = systemConnection || (await connectUtility(driver, connection, 'write'));

  try {
    if (!analysedStructure) {
      analysedStructure = await driver.analyseFull(dbhan);
    }

    const sourceDir = archive
      ? resolveArchiveFolder(archive)
      : folder?.startsWith('archive:')
      ? resolveArchiveFolder(folder.substring('archive:'.length))
      : folder;

    const dupl = new DataDuplicator(
      dbhan,
      driver,
      analysedStructure,
      items.map(item => ({
        name: item.name,
        operation: item.operation,
        matchColumns: item.matchColumns,
        openStream:
          item.openStream || (() => jsonLinesReader({ fileName: path.join(sourceDir, `${item.name}.jsonl`) })),
      })),
      stream,
      copyStream,
      options
    );

    await dupl.run();
  } finally {
    if (!systemConnection) {
      await driver.close(dbhan);
    }
  }
}

module.exports = dataDuplicator;
