const stableStringify = require('json-stable-stringify');
const { splitQuery } = require('dbgate-query-splitter');
const childProcessChecker = require('../utility/childProcessChecker');
const {
  extractBoolSettingsValue,
  extractIntSettingsValue,
  getLogger,
  isCompositeDbName,
  extractErrorMessage,
  extractErrorLogData,
  ScriptWriterEval,
  SqlGenerator,
  playJsonScriptWriter,
  serializeJsTypesForJsonStringify,
} = require('dbgate-tools');
const requireEngineDriver = require('../utility/requireEngineDriver');
const { connectUtility } = require('../utility/connectUtility');
const { handleProcessCommunication } = require('../utility/processComm');
const generateDeploySql = require('../shell/generateDeploySql');
const { dumpSqlSelect, scriptToSql } = require('dbgate-sqltree');
const { allowExecuteCustomScript, handleQueryStream } = require('../utility/handleQueryStream');
const { enrichQueryResultColumns } = require('../utility/queryResultMetadata');
const dbgateApi = require('../shell');
const requirePlugin = require('../shell/requirePlugin');
const path = require('path');
const { rundir } = require('../utility/directories');
const fs = require('fs-extra');
const { changeSetToSql } = require('dbgate-datalib');
const _ = require('lodash');

const logger = getLogger('dbconnProcess');

let dbhan;
let storedConnection;
let afterConnectCallbacks = [];
let afterAnalyseCallbacks = [];
let analysedStructure = null;
let lastPing = null;
let lastStatusString = null;
let lastStatus = null;
let analysedTime = 0;
let serverVersion;

let statusCounter = 0;
function getStatusCounter() {
  statusCounter += 1;
  return statusCounter;
}

function getLogInfo() {
  return {
    database: dbhan ? dbhan.database : undefined,
    conid: dbhan ? dbhan.conid : undefined,
    engine: storedConnection ? storedConnection.engine : undefined,
  };
}

async function checkedAsyncCall(promise) {
  try {
    const res = await promise;
    return res;
  } catch (err) {
    setStatus({
      name: 'error',
      message: extractErrorMessage(err, 'Checked call error'),
    });
    // console.error(err);
    setTimeout(() => process.exit(1), 1000);
    throw err;
  }
}

let loadingModel = false;
let queuedSyncModelFullRefresh = null;

function finishLoadingModel() {
  loadingModel = false;
  if (queuedSyncModelFullRefresh != null) {
    const isFullRefresh = queuedSyncModelFullRefresh;
    queuedSyncModelFullRefresh = null;
    handleSyncModel({ isFullRefresh });
  }
}

async function handleFullRefresh() {
  if (storedConnection.useSeparateSchemas && !isCompositeDbName(dbhan?.database)) {
    resolveAnalysedPromises();
    // skip loading DB structure
    return;
  }

  loadingModel = true;
  const driver = requireEngineDriver(storedConnection);
  setStatusName('loadStructure');
  analysedStructure = await checkedAsyncCall(driver.analyseFull(dbhan, serverVersion));
  analysedTime = new Date().getTime();
  process.send({ msgtype: 'structure', structure: analysedStructure });
  process.send({ msgtype: 'structureTime', analysedTime });
  setStatusName('ok');

  finishLoadingModel();
  resolveAnalysedPromises();
}

async function handleIncrementalRefresh(forceSend) {
  if (storedConnection.useSeparateSchemas && !isCompositeDbName(dbhan?.database)) {
    resolveAnalysedPromises();
    // skip loading DB structure
    return;
  }
  loadingModel = true;
  const driver = requireEngineDriver(storedConnection);
  setStatusName('checkStructure');
  const newStructure = await checkedAsyncCall(driver.analyseIncremental(dbhan, analysedStructure, serverVersion));
  analysedTime = new Date().getTime();
  if (newStructure != null) {
    analysedStructure = newStructure;
  }

  if (forceSend || newStructure != null) {
    process.send({ msgtype: 'structure', structure: analysedStructure });
  }

  process.send({ msgtype: 'structureTime', analysedTime });
  setStatusName('ok');
  finishLoadingModel();
  resolveAnalysedPromises();
}

function handleSyncModel({ isFullRefresh }) {
  if (loadingModel) {
    queuedSyncModelFullRefresh = queuedSyncModelFullRefresh || !!isFullRefresh;
    return;
  }
  if (isFullRefresh) handleFullRefresh();
  else handleIncrementalRefresh();
}

function setStatus(status) {
  const newStatus = { ...lastStatus, ...status };
  const statusString = stableStringify(newStatus);
  if (lastStatusString != statusString) {
    process.send({ msgtype: 'status', status: { ...newStatus, counter: getStatusCounter() } });
    lastStatusString = statusString;
    lastStatus = newStatus;
  }
}

function setStatusName(name) {
  setStatus({ name, message: null });
}

async function readVersion() {
  const driver = requireEngineDriver(storedConnection);
  try {
    const version = await driver.getVersion(dbhan);
    logger.debug(getLogInfo(), `DBGM-00037 Got server version: ${version.version}`);
    serverVersion = version;
  } catch (err) {
    logger.error(extractErrorLogData(err, getLogInfo()), 'DBGM-00149 Error getting DB server version');
    serverVersion = { version: 'Unknown' };
  }
  process.send({ msgtype: 'version', version: serverVersion });
}

async function handleConnect({ connection, structure, globalSettings }) {
  storedConnection = connection;
  lastPing = new Date().getTime();

  if (!structure) setStatusName('pending');
  const driver = requireEngineDriver(storedConnection);
  dbhan = await checkedAsyncCall(connectUtility(driver, storedConnection, 'app'));
  logger.debug(
    getLogInfo(),
    `DBGM-00038 Connected to database, separate schemas: ${storedConnection.useSeparateSchemas ? 'YES' : 'NO'}`
  );
  dbhan.feedback = feedback => setStatus({ feedback });
  await checkedAsyncCall(readVersion());
  if (structure) {
    analysedStructure = structure;
    handleIncrementalRefresh(true);
  } else {
    handleFullRefresh();
  }

  if (extractBoolSettingsValue(globalSettings, 'connection.autoRefresh', false)) {
    setInterval(
      handleIncrementalRefresh,
      extractIntSettingsValue(globalSettings, 'connection.autoRefreshInterval', 30, 3, 3600) * 1000
    );
  }

  for (const [resolve] of afterConnectCallbacks) {
    resolve();
  }
  afterConnectCallbacks = [];
}

function waitConnected() {
  if (dbhan) return Promise.resolve();
  return new Promise((resolve, reject) => {
    afterConnectCallbacks.push([resolve, reject]);
  });
}

function waitStructure() {
  if (analysedStructure) return Promise.resolve();
  return new Promise((resolve, reject) => {
    afterAnalyseCallbacks.push([resolve, reject]);
  });
}

async function handleGetStructure({ msgid }) {
  await waitStructure();
  process.send({
    msgtype: 'response',
    msgid,
    structure: serializeJsTypesForJsonStringify(analysedStructure),
  });
}

function resolveAnalysedPromises() {
  for (const [resolve] of afterAnalyseCallbacks) {
    resolve();
  }
  afterAnalyseCallbacks = [];
}

async function handleRunScript({ msgid, sql, useTransaction }, skipReadonlyCheck = false) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    if (!skipReadonlyCheck) ensureExecuteCustomScript(driver);
    await driver.script(dbhan, sql, { useTransaction });
    process.send({ msgtype: 'response', msgid });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'Error executing SQL script'),
    });
  }
}

async function handleRunOperation({ msgid, operation, useTransaction }, skipReadonlyCheck = false) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    if (!skipReadonlyCheck) ensureExecuteCustomScript(driver);
    await driver.operation(dbhan, operation, { useTransaction });
    process.send({ msgtype: 'response', msgid });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'Error executing DB operation'),
    });
  }
}

async function handleQueryData({ msgid, sql, range, commandTimeout }, skipReadonlyCheck = false) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    if (!skipReadonlyCheck) ensureExecuteCustomScript(driver);
    const res = await driver.query(dbhan, sql, { range, commandTimeout });
    if (res?.columns) {
      res.columns = await enrichQueryResultColumns({ dbhan, driver, sql, columns: res.columns, dbinfo: analysedStructure });
    }
    process.send({ msgtype: 'response', msgid, ...serializeJsTypesForJsonStringify(res) });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'Error executing SQL script'),
    });
  }
}

async function handleSqlSelect({ msgid, select, commandTimeout }) {
  const driver = requireEngineDriver(storedConnection);
  const dmp = driver.createDumper();
  dumpSqlSelect(dmp, select);
  return handleQueryData({ msgid, sql: dmp.s, range: select.range, commandTimeout }, true);
}

async function handleDriverDataCore(msgid, callMethod, { logName }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    const result = await callMethod(driver);
    process.send({ msgtype: 'response', msgid, result: serializeJsTypesForJsonStringify(result) });
  } catch (err) {
    logger.error(
      extractErrorLogData(err, { logName, ...getLogInfo() }),
      `DBGM-00150 Error when handling message ${logName}`
    );
    process.send({ msgtype: 'response', msgid, errorMessage: extractErrorMessage(err, 'Error executing DB data') });
  }
}

async function handleSchemaList({ msgid }) {
  logger.debug(getLogInfo(), 'DBGM-00039 Loading schema list');
  return handleDriverDataCore(msgid, driver => driver.listSchemas(dbhan), { logName: 'listSchemas' });
}

async function handleCollectionData({ msgid, options }) {
  return handleDriverDataCore(msgid, driver => driver.readCollection(dbhan, options), { logName: 'readCollection' });
}

async function handleLoadKeys({ msgid, root, filter, limit }) {
  return handleDriverDataCore(msgid, driver => driver.loadKeys(dbhan, root, filter, limit), { logName: 'loadKeys' });
}

async function handleScanKeys({ msgid, pattern, cursor, count }) {
  return handleDriverDataCore(msgid, driver => driver.scanKeys(dbhan, pattern, cursor, count), { logName: 'scanKeys' });
}

async function handleExportKeys({ msgid, options }) {
  return handleDriverDataCore(msgid, driver => driver.exportKeys(dbhan, options), { logName: 'exportKeys' });
}

async function handleLoadKeyInfo({ msgid, key }) {
  return handleDriverDataCore(msgid, driver => driver.loadKeyInfo(dbhan, key), { logName: 'loadKeyInfo' });
}

async function handleCallMethod({ msgid, method, args }) {
  return handleDriverDataCore(
    msgid,
    driver => {
      if (storedConnection.isReadOnly) {
        throw new Error('Connection is read only, cannot call custom methods');
      }

      ensureExecuteCustomScript(driver);
      return driver.callMethod(dbhan, method, args);
    },
    { logName: `callMethod:${method}` }
  );
}

async function handleLoadKeyTableRange({ msgid, key, cursor, count }) {
  return handleDriverDataCore(msgid, driver => driver.loadKeyTableRange(dbhan, key, cursor, count), {
    logName: 'loadKeyTableRange',
  });
}

async function handleLoadFieldValues({ msgid, schemaName, pureName, field, search, dataType }) {
  return handleDriverDataCore(
    msgid,
    driver => driver.loadFieldValues(dbhan, { schemaName, pureName }, field, search, dataType),
    {
      logName: 'loadFieldValues',
    }
  );
}

function ensureExecuteCustomScript(driver) {
  if (driver.readOnlySessions) {
    return;
  }
  if (storedConnection.isReadOnly) {
    throw new Error('Connection is read only');
  }
}

async function handleUpdateCollection({ msgid, changeSet }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    ensureExecuteCustomScript(driver);
    const result = await driver.updateCollection(dbhan, changeSet);
    process.send({ msgtype: 'response', msgid, result });
  } catch (err) {
    process.send({ msgtype: 'response', msgid, errorMessage: extractErrorMessage(err, 'Error updating collection') });
  }
}

async function handleSaveTableData({ msgid, changeSet }) {
  await waitStructure();
  try {
    const driver = requireEngineDriver(storedConnection);
    const script = driver.createSaveChangeSetScript(changeSet, analysedStructure, () =>
      changeSetToSql(changeSet, analysedStructure, driver.dialect)
    );
    const sql = scriptToSql(driver, script);
    await driver.script(dbhan, sql, { useTransaction: true });
    process.send({ msgtype: 'response', msgid });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'Error executing SQL script'),
    });
  }
}

function validateQueryResultChangeSet(driver, changeSet) {
  if (!driver.databaseEngineTypes?.includes('sql') || !driver.supportsEditableQueryResults) {
    throw new Error('DBGM-00000 Editable query results are not supported by this driver');
  }
  if (changeSet?.inserts?.length > 0 || changeSet?.deletes?.length > 0) {
    throw new Error('DBGM-00000 Query result saving supports UPDATE operations only');
  }
  for (const update of changeSet?.updates || []) {
    if (!update.pureName) {
      throw new Error('DBGM-00000 Query result update is missing target table');
    }
    if (_.isEmpty(update.fields)) {
      throw new Error('DBGM-00000 Query result update is missing changed fields');
    }
    if (_.isEmpty(update.condition)) {
      throw new Error('DBGM-00000 Query result update is missing row condition');
    }
    if (Object.values(update.condition).some(value => value === null || value === undefined)) {
      throw new Error('DBGM-00000 Query result update has incomplete row condition');
    }
  }
}

async function handleSaveQueryResultData({ msgid, changeSet, sql }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);
  try {
    ensureExecuteCustomScript(driver);
    validateQueryResultChangeSet(driver, changeSet);
    if (!sql) {
      const script = changeSetToSql({ ...changeSet, inserts: [], deletes: [] }, null, driver.dialect);
      if (script.some(command => command.commandType != 'update')) {
        throw new Error('DBGM-00000 Query result saving supports UPDATE operations only');
      }
      sql = scriptToSql(driver, script);
    }
    if (sql) {
      await driver.script(dbhan, sql, { useTransaction: false });
    }
    process.send({ msgtype: 'response', msgid, result: { state: 'ok' } });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'DBGM-00000 Error saving query result data'),
    });
  }
}

async function handleMultiCallMethod({ msgid, callList }) {
  try {
    const driver = requireEngineDriver(storedConnection);
    await driver.invokeMethodCallList(dbhan, callList);

    // for (const change of changeSet.changes) {
    //   if (change.type === 'string') {
    //     await driver.query(dbhan, `SET "${change.key}" "${change.value}"`);
    //   } else if (change.type === 'json') {
    //     await driver.query(dbhan, `JSON.SET "${change.key}" $ '${change.value.replace(/'/g, "\\'")}'`);
    //   } else if (change.type === 'hash') {
    //     if (change.updates && Array.isArray(change.updates)) {
    //       for (const update of change.updates) {
    //         await driver.query(dbhan, `HSET "${change.key}" "${update.key}" "${update.value}"`);
          
    //         if (update.ttl !== undefined && update.ttl !== null && update.ttl !== -1) {
    //           try {
    //             await dbhan.client.call('HEXPIRE', change.key, update.ttl, 'FIELDS', 1, update.key);
    //           } catch (e) {}
    //         }
    //       }
    //     }
    //     if (change.inserts && Array.isArray(change.inserts)) {
    //       for (const insert of change.inserts) {
    //         await driver.query(dbhan, `HSET "${change.key}" "${insert.key}" "${insert.value}"`);
            
    //         if (insert.ttl !== undefined && insert.ttl !== null && insert.ttl !== -1) {
    //           try {
    //             await dbhan.client.call('HEXPIRE', change.key, insert.ttl, 'FIELDS', 1, insert.key);
    //           } catch (e) {}
    //         }
    //       }
    //     }
    //     if (change.deletes && Array.isArray(change.deletes)) {
    //       for (const delKey of change.deletes) {
    //         await driver.query(dbhan, `HDEL "${change.key}" "${delKey}"`);
    //       }
    //     }
    //   } else if (change.type === 'zset') {
    //     if (change.updates && Array.isArray(change.updates)) {
    //       for (const update of change.updates) {
    //         await driver.query(dbhan, `ZADD "${change.key}" ${update.score} "${update.member}"`);
    //       }
    //     }
    //     if (change.inserts && Array.isArray(change.inserts)) {
    //       for (const insert of change.inserts) {
    //         await driver.query(dbhan, `ZADD "${change.key}" ${insert.score} "${insert.member}"`);
    //       }
    //     }
    //     if (change.deletes && Array.isArray(change.deletes)) {
    //       for (const delMember of change.deletes) {
    //         await driver.query(dbhan, `ZREM "${change.key}" "${delMember}"`);
    //       }
    //     }
    //   } else if (change.type === 'list') {
    //     if (change.updates && Array.isArray(change.updates)) {
    //       for (const update of change.updates) {
    //         await driver.query(dbhan, `LSET "${change.key}" ${update.index} "${update.value}"`);
    //       }
    //     }
    //     if (change.inserts && Array.isArray(change.inserts)) {
    //       for (const insert of change.inserts) {
    //         await driver.query(dbhan, `RPUSH "${change.key}" "${insert.value}"`);
    //       }
    //     }
    //   } else if (change.type === 'set') {
    //     if (change.inserts && Array.isArray(change.inserts)) {
    //       for (const insert of change.inserts) {
    //         await driver.query(dbhan, `SADD "${change.key}" "${insert.value}"`);
    //       }
    //     }
    //     if (change.deletes && Array.isArray(change.deletes)) {
    //       for (const delValue of change.deletes) {
    //         await driver.query(dbhan, `SREM "${change.key}" "${delValue}"`);
    //       }
    //     }
    //   } else if (change.type === 'stream') {
    //     if (change.inserts && Array.isArray(change.inserts)) {
    //       for (const insert of change.inserts) {
    //         const streamId = insert.id === '*' || !insert.id ? '*' : insert.id;
    //         await driver.query(dbhan, `XADD "${change.key}" ${streamId} value "${insert.value}"`);
    //       }
    //     }
    //     if (change.deletes && Array.isArray(change.deletes)) {
    //       for (const delId of change.deletes) {
    //         await driver.query(dbhan, `XDEL "${change.key}" "${delId}"`);
    //       }
    //     }
    //   }
    // }

    process.send({ msgtype: 'response', msgid });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      errorMessage: extractErrorMessage(err, 'Error saving Redis data'),
    });
  }
}

async function handleSqlPreview({ msgid, objects, options }) {
  await waitStructure();
  const driver = requireEngineDriver(storedConnection);

  try {
    const dmp = driver.createDumper();
    const generator = new SqlGenerator(analysedStructure, options, objects, dmp, driver, dbhan);

    await generator.dump();
    process.send({ msgtype: 'response', msgid, sql: dmp.s, isTruncated: generator.isTruncated });
    if (generator.isUnhandledException) {
      setTimeout(async () => {
        logger.error(getLogInfo(), 'DBGM-00151 Exiting because of unhandled exception');
        await driver.close(dbhan);
        process.exit(0);
      }, 500);
    }
  } catch (err) {
    console.error(err);
    process.send({
      msgtype: 'response',
      msgid,
      isError: true,
      errorMessage: extractErrorMessage(err, 'Error generating SQL preview'),
    });
  }
}

async function handleGenerateDeploySql({ msgid, modelFolder }) {
  await waitStructure();

  try {
    const res = await generateDeploySql({
      systemConnection: dbhan,
      connection: storedConnection,
      analysedStructure,
      modelFolder,
    });
    process.send({ ...res, msgtype: 'response', msgid });
  } catch (err) {
    process.send({
      msgtype: 'response',
      msgid,
      isError: true,
      errorMessage: extractErrorMessage(err, 'Error generating deploy SQL'),
    });
  }
}

async function handleExecuteSessionQuery({ sesid, sql }) {
  await waitConnected();
  const driver = requireEngineDriver(storedConnection);

  if (!allowExecuteCustomScript(storedConnection, driver)) {
    process.send({
      msgtype: 'info',
      info: {
        message: 'Connection without read-only sessions is read only',
        severity: 'error',
      },
      sesid,
    });
    process.send({ msgtype: 'done', sesid, skipFinishedMessage: true });
    return;
    //process.send({ msgtype: 'error', error: e.message });
  }

  const queryStreamInfoHolder = {
    resultIndex: 0,
    canceled: false,
  };
  for (const sqlItem of splitQuery(sql, {
    ...driver.getQuerySplitterOptions('stream'),
    returnRichInfo: true,
  })) {
    await handleQueryStream(dbhan, driver, queryStreamInfoHolder, sqlItem, sesid, undefined, undefined, false, analysedStructure);
    if (queryStreamInfoHolder.canceled) {
      break;
    }
  }
  process.send({ msgtype: 'done', sesid });
}

async function handleEvalJsonScript({ script, runid }) {
  const directory = path.join(rundir(), runid);
  fs.mkdirSync(directory);
  const originalCwd = process.cwd();
  let scriptError = null;
  let finalizerError = null;

  try {
    process.chdir(directory);

    try {
      const evalWriter = new ScriptWriterEval(dbgateApi, requirePlugin, dbhan, runid);
      await playJsonScriptWriter(script, evalWriter);
    } catch (err) {
      scriptError = err;
    } finally {
      try {
        await dbgateApi.finalizer.run();
      } catch (err) {
        finalizerError = err;
      }
    }

    const shouldReportScriptError = scriptError && !scriptError.dbgateCopyStreamErrorReported;

    if (shouldReportScriptError || finalizerError) {
      if (shouldReportScriptError) {
        logger.error(extractErrorLogData(scriptError), 'DBGM-00000 Error running JSON script on database connection');
      }
      if (finalizerError) {
        logger.error(extractErrorLogData(finalizerError), 'DBGM-00000 Error running JSON script finalizers');
      }

      process.send({
        msgtype: 'copyStreamError',
        copyStreamError: {
          message: [
            shouldReportScriptError && extractErrorMessage(scriptError),
            finalizerError && `Finalizer failed: ${extractErrorMessage(finalizerError)}`,
          ]
            .filter(Boolean)
            .join('\n'),
          progressName: { name: 'script', runid },
        },
      });
    } else {
      process.send({ msgtype: 'runnerDone', runid });
    }
  } finally {
    process.chdir(originalCwd);
  }
}

// async function handleRunCommand({ msgid, sql }) {
//   await waitConnected();
//   const driver = engines(storedConnection);
//   const res = await driver.query(systemConnection, sql);
//   process.send({ msgtype: 'response', msgid, ...res });
// }

function handlePing() {
  lastPing = new Date().getTime();
}

const messageHandlers = {
  connect: handleConnect,
  queryData: handleQueryData,
  runScript: handleRunScript,
  runOperation: handleRunOperation,
  updateCollection: handleUpdateCollection,
  saveTableData: handleSaveTableData,
  saveQueryResultData: handleSaveQueryResultData,
  collectionData: handleCollectionData,
  loadKeys: handleLoadKeys,
  scanKeys: handleScanKeys,
  loadKeyInfo: handleLoadKeyInfo,
  callMethod: handleCallMethod,
  loadKeyTableRange: handleLoadKeyTableRange,
  sqlPreview: handleSqlPreview,
  ping: handlePing,
  syncModel: handleSyncModel,
  generateDeploySql: handleGenerateDeploySql,
  loadFieldValues: handleLoadFieldValues,
  sqlSelect: handleSqlSelect,
  exportKeys: handleExportKeys,
  schemaList: handleSchemaList,
  getStructure: handleGetStructure,
  executeSessionQuery: handleExecuteSessionQuery,
  evalJsonScript: handleEvalJsonScript,
  multiCallMethod: handleMultiCallMethod,
  // runCommand: handleRunCommand,
};

async function handleMessage({ msgtype, ...other }) {
  const handler = messageHandlers[msgtype];
  await handler(other);
}

function start() {
  childProcessChecker();

  setInterval(async () => {
    const time = new Date().getTime();
    if (time - lastPing > 40 * 1000) {
      logger.info(getLogInfo(), 'DBGM-00040 Database connection not alive, exiting');
      const driver = requireEngineDriver(storedConnection);
      await driver.close(dbhan);
      process.exit(0);
    }
  }, 10 * 1000);

  process.on('message', async message => {
    if (handleProcessCommunication(message)) return;
    try {
      await handleMessage(message);
    } catch (err) {
      logger.error(extractErrorLogData(err, getLogInfo()), 'DBGM-00041 Error in DB connection');
      process.send({
        msgtype: 'error',
        error: extractErrorMessage(err, 'DBGM-00042 Error processing message'),
        msgid: message?.msgid,
      });
    }
  });
}

module.exports = { start };
