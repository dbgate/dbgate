const stream = require('stream');
const path = require('path');
const { quoteFullName, fullNameToString, getLogger } = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const logger = getLogger('datareplicator');
const { DataReplicator } = require('dbgate-datalib');
const { compileCompoudEvalCondition } = require('dbgate-filterparser');
const copyStream = require('./copyStream');
const jsonLinesReader = require('./jsonLinesReader');
const { resolveArchiveFolder } = require('../utility/directories');
const { evaluateCondition } = require('dbgate-sqltree');

function compileOperationFunction(enabled, condition) {
  if (!enabled) return _row => false;
  const conditionCompiled = compileCompoudEvalCondition(condition);
  if (condition) {
    return row => evaluateCondition(conditionCompiled, row);
  }
  return _row => true;
}

async function dataReplicator({
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

    let joinPath;

    if (archive?.endsWith('.zip')) {
      joinPath = file => `zip://archive:${archive}//${file}`;
    } else {
      const sourceDir = archive
        ? resolveArchiveFolder(archive)
        : folder?.startsWith('archive:')
        ? resolveArchiveFolder(folder.substring('archive:'.length))
        : folder;
      joinPath = file => path.join(sourceDir, file);
    }

    const repl = new DataReplicator(
      dbhan,
      driver,
      analysedStructure,
      items.map(item => {
        return {
          name: item.name,
          matchColumns: item.matchColumns,
          findExisting: compileOperationFunction(item.findExisting, item.findCondition),
          createNew: compileOperationFunction(item.createNew, item.createCondition),
          updateExisting: compileOperationFunction(item.updateExisting, item.updateCondition),
          deleteMissing: !!item.deleteMissing,
          deleteRestrictionColumns: item.deleteRestrictionColumns ?? [],
          openStream: item.openStream
            ? item.openStream
            : item.jsonArray
            ? () => stream.Readable.from(item.jsonArray)
            : () => jsonLinesReader({ fileName: joinPath(`${item.name}.jsonl`) }),
        };
      }),
      stream,
      copyStream,
      options
    );

    await repl.run();
    if (options?.runid) {
      process.send({
        msgtype: 'dataResult',
        runid: options?.runid,
        dataResult: repl.result,
      });
    }
    return repl.result;
  } finally {
    if (!systemConnection) {
      await driver.close(dbhan);
    }
  }
}

module.exports = dataReplicator;
