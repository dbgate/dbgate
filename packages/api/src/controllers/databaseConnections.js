const uuidv1 = require('uuid/v1');
const connections = require('./connections');
const archive = require('./archive');
const socket = require('../utility/socket');
const { fork } = require('child_process');
const {
  DatabaseAnalyser,
  computeDbDiffRows,
  getCreateObjectScript,
  getAlterDatabaseScript,
  generateDbPairingId,
  matchPairedObjects,
  extendDatabaseInfo,
  modelCompareDbDiffOptions,
  getLogger,
} = require('dbgate-tools');
const { html, parse } = require('diff2html');
const { handleProcessCommunication } = require('../utility/processComm');
const config = require('./config');
const fs = require('fs-extra');
const exportDbModel = require('../utility/exportDbModel');
const { archivedir, resolveArchiveFolder, uploadsdir } = require('../utility/directories');
const path = require('path');
const importDbModel = require('../utility/importDbModel');
const requireEngineDriver = require('../utility/requireEngineDriver');
const generateDeploySql = require('../shell/generateDeploySql');
const { createTwoFilesPatch } = require('diff');
const diff2htmlPage = require('../utility/diff2htmlPage');
const processArgs = require('../utility/processArgs');
const { testConnectionPermission } = require('../utility/hasPermission');
const { MissingCredentialsError } = require('../utility/exceptions');
const pipeForkLogs = require('../utility/pipeForkLogs');

const logger = getLogger('databaseConnections');

module.exports = {
  /** @type {import('dbgate-types').OpenedDatabaseConnection[]} */
  opened: [],
  closed: {},
  requests: {},

  async _init() {
    connections._closeAll = conid => this.closeAll(conid);
  },

  handle_structure(conid, database, { structure }) {
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (!existing) return;
    existing.structure = structure;
    socket.emitChanged('database-structure-changed', { conid, database });
  },
  handle_structureTime(conid, database, { analysedTime }) {
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (!existing) return;
    existing.analysedTime = analysedTime;
    socket.emitChanged(`database-status-changed`, { conid, database });
  },
  handle_version(conid, database, { version }) {
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (!existing) return;
    existing.serverVersion = version;
    socket.emitChanged(`database-server-version-changed`, { conid, database });
  },

  handle_error(conid, database, props) {
    const { error } = props;
    logger.error(`Error in database connection ${conid}, database ${database}: ${error}`);
  },
  handle_response(conid, database, { msgid, ...response }) {
    const [resolve, reject] = this.requests[msgid];
    resolve(response);
    delete this.requests[msgid];
  },
  handle_status(conid, database, { status }) {
    // console.log('HANDLE SET STATUS', status);
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (!existing) return;
    if (existing.status && status && existing.status.counter > status.counter) return;
    existing.status = status;
    socket.emitChanged(`database-status-changed`, { conid, database });
  },

  handle_ping() {},

  async ensureOpened(conid, database) {
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (existing) return existing;
    const connection = await connections.getCore({ conid });
    if (connection.passwordMode == 'askPassword' || connection.passwordMode == 'askUser') {
      throw new MissingCredentialsError({ conid, passwordMode: connection.passwordMode });
    }
    const subprocess = fork(
      global['API_PACKAGE'] || process.argv[1],
      [
        '--is-forked-api',
        '--start-process',
        'databaseConnectionProcess',
        ...processArgs.getPassArgs(),
        // ...process.argv.slice(3),
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      }
    );
    pipeForkLogs(subprocess);
    const lastClosed = this.closed[`${conid}/${database}`];
    const newOpened = {
      conid,
      database,
      subprocess,
      structure: lastClosed ? lastClosed.structure : DatabaseAnalyser.createEmptyStructure(),
      serverVersion: lastClosed ? lastClosed.serverVersion : null,
      connection,
      status: { name: 'pending' },
    };
    this.opened.push(newOpened);
    subprocess.on('message', message => {
      // @ts-ignore
      const { msgtype } = message;
      if (handleProcessCommunication(message, subprocess)) return;
      if (newOpened.disconnected) return;
      this[`handle_${msgtype}`](conid, database, message);
    });
    subprocess.on('exit', () => {
      if (newOpened.disconnected) return;
      this.close(conid, database, false);
    });

    subprocess.send({
      msgtype: 'connect',
      connection: { ...connection, database },
      structure: lastClosed ? lastClosed.structure : null,
      globalSettings: await config.getSettings(),
    });
    return newOpened;
  },

  /** @param {import('dbgate-types').OpenedDatabaseConnection} conn */
  sendRequest(conn, message) {
    const msgid = uuidv1();
    const promise = new Promise((resolve, reject) => {
      this.requests[msgid] = [resolve, reject];
      try {
        conn.subprocess.send({ msgid, ...message });
      } catch (err) {
        logger.error({ err }, 'Error sending request do process');
        this.close(conn.conid, conn.database);
      }
    });
    return promise;
  },

  queryData_meta: true,
  async queryData({ conid, database, sql }, req) {
    testConnectionPermission(conid, req);
    logger.info({ conid, database, sql }, 'Processing query');
    const opened = await this.ensureOpened(conid, database);
    // if (opened && opened.status && opened.status.name == 'error') {
    //   return opened.status;
    // }
    const res = await this.sendRequest(opened, { msgtype: 'queryData', sql });
    return res;
  },

  sqlSelect_meta: true,
  async sqlSelect({ conid, database, select }, req) {
    testConnectionPermission(conid, req);
    const opened = await this.ensureOpened(conid, database);
    const res = await this.sendRequest(opened, { msgtype: 'sqlSelect', select });
    return res;
  },

  runScript_meta: true,
  async runScript({ conid, database, sql, useTransaction }, req) {
    testConnectionPermission(conid, req);
    logger.info({ conid, database, sql }, 'Processing script');
    const opened = await this.ensureOpened(conid, database);
    const res = await this.sendRequest(opened, { msgtype: 'runScript', sql, useTransaction });
    return res;
  },

  collectionData_meta: true,
  async collectionData({ conid, database, options }, req) {
    testConnectionPermission(conid, req);
    const opened = await this.ensureOpened(conid, database);
    const res = await this.sendRequest(opened, { msgtype: 'collectionData', options });
    return res.result || null;
  },

  async loadDataCore(msgtype, { conid, database, ...args }, req) {
    testConnectionPermission(conid, req);
    const opened = await this.ensureOpened(conid, database);
    const res = await this.sendRequest(opened, { msgtype, ...args });
    if (res.errorMessage) {
      console.error(res.errorMessage);

      return {
        errorMessage: res.errorMessage,
      };
    }
    return res.result || null;
  },

  loadKeys_meta: true,
  async loadKeys({ conid, database, root, filter }, req) {
    testConnectionPermission(conid, req);
    return this.loadDataCore('loadKeys', { conid, database, root, filter });
  },

  exportKeys_meta: true,
  async exportKeys({ conid, database, options }, req) {
    testConnectionPermission(conid, req);
    return this.loadDataCore('exportKeys', { conid, database, options });
  },

  loadKeyInfo_meta: true,
  async loadKeyInfo({ conid, database, key }, req) {
    testConnectionPermission(conid, req);
    return this.loadDataCore('loadKeyInfo', { conid, database, key });
  },

  loadKeyTableRange_meta: true,
  async loadKeyTableRange({ conid, database, key, cursor, count }, req) {
    testConnectionPermission(conid, req);
    return this.loadDataCore('loadKeyTableRange', { conid, database, key, cursor, count });
  },

  loadFieldValues_meta: true,
  async loadFieldValues({ conid, database, schemaName, pureName, field, search }, req) {
    testConnectionPermission(conid, req);
    return this.loadDataCore('loadFieldValues', { conid, database, schemaName, pureName, field, search });
  },

  callMethod_meta: true,
  async callMethod({ conid, database, method, args }, req) {
    testConnectionPermission(conid, req);
    return this.loadDataCore('callMethod', { conid, database, method, args });

    // const opened = await this.ensureOpened(conid, database);
    // const res = await this.sendRequest(opened, { msgtype: 'callMethod', method, args });
    // if (res.errorMessage) {
    //   console.error(res.errorMessage);
    // }
    // return res.result || null;
  },

  updateCollection_meta: true,
  async updateCollection({ conid, database, changeSet }, req) {
    testConnectionPermission(conid, req);
    const opened = await this.ensureOpened(conid, database);
    const res = await this.sendRequest(opened, { msgtype: 'updateCollection', changeSet });
    if (res.errorMessage) {
      return {
        errorMessage: res.errorMessage,
      };
    }
    return res.result || null;
  },

  status_meta: true,
  async status({ conid, database }, req) {
    if (!conid) {
      return {
        name: 'error',
        message: 'No connection',
      };
    }
    testConnectionPermission(conid, req);
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (existing) {
      return {
        ...existing.status,
        analysedTime: existing.analysedTime,
      };
    }
    const lastClosed = this.closed[`${conid}/${database}`];
    if (lastClosed) {
      return {
        ...lastClosed.status,
        analysedTime: lastClosed.analysedTime,
      };
    }
    return {
      name: 'error',
      message: 'Not connected',
    };
  },

  ping_meta: true,
  async ping({ conid, database }, req) {
    testConnectionPermission(conid, req);
    let existing = this.opened.find(x => x.conid == conid && x.database == database);

    if (existing) {
      try {
        existing.subprocess.send({ msgtype: 'ping' });
      } catch (err) {
        logger.error({ err }, 'Error pinging DB connection');
        this.close(conid, database);

        return {
          status: 'error',
          message: 'Ping failed',
        };
      }
    } else {
      // @ts-ignore
      existing = await this.ensureOpened(conid, database);
    }

    return {
      status: 'ok',
      connectionStatus: existing ? existing.status : null,
    };
  },

  refresh_meta: true,
  async refresh({ conid, database, keepOpen }, req) {
    testConnectionPermission(conid, req);
    if (!keepOpen) this.close(conid, database);

    await this.ensureOpened(conid, database);
    return { status: 'ok' };
  },

  syncModel_meta: true,
  async syncModel({ conid, database, isFullRefresh }, req) {
    testConnectionPermission(conid, req);
    const conn = await this.ensureOpened(conid, database);
    conn.subprocess.send({ msgtype: 'syncModel', isFullRefresh });
    return { status: 'ok' };
  },

  close(conid, database, kill = true) {
    const existing = this.opened.find(x => x.conid == conid && x.database == database);
    if (existing) {
      existing.disconnected = true;
      if (kill) {
        try {
          existing.subprocess.kill();
        } catch (err) {
          logger.error({ err }, 'Error killing subprocess');
        }
      }
      this.opened = this.opened.filter(x => x.conid != conid || x.database != database);
      this.closed[`${conid}/${database}`] = {
        status: {
          ...existing.status,
          name: 'error',
        },
        structure: existing.structure,
      };
      socket.emitChanged(`database-status-changed`, { conid, database });
    }
  },

  closeAll(conid, kill = true) {
    for (const existing of this.opened.filter(x => x.conid == conid)) {
      this.close(conid, existing.database, kill);
    }
  },

  disconnect_meta: true,
  async disconnect({ conid, database }, req) {
    testConnectionPermission(conid, req);
    await this.close(conid, database, true);
    return { status: 'ok' };
  },

  structure_meta: true,
  async structure({ conid, database }, req) {
    testConnectionPermission(conid, req);
    if (conid == '__model') {
      const model = await importDbModel(database);
      return model;
    }

    const opened = await this.ensureOpened(conid, database);
    return opened.structure;
    // const existing = this.opened.find((x) => x.conid == conid && x.database == database);
    // if (existing) return existing.status;
    // return {
    //   name: 'error',
    //   message: 'Not connected',
    // };
  },

  serverVersion_meta: true,
  async serverVersion({ conid, database }, req) {
    if (!conid) {
      return null;
    }
    testConnectionPermission(conid, req);
    if (!conid) return null;
    const opened = await this.ensureOpened(conid, database);
    return opened.serverVersion || null;
  },

  sqlPreview_meta: true,
  async sqlPreview({ conid, database, objects, options }, req) {
    testConnectionPermission(conid, req);
    // wait for structure
    await this.structure({ conid, database });

    const opened = await this.ensureOpened(conid, database);
    const res = await this.sendRequest(opened, { msgtype: 'sqlPreview', objects, options });
    return res;
  },

  exportModel_meta: true,
  async exportModel({ conid, database }, req) {
    testConnectionPermission(conid, req);
    const archiveFolder = await archive.getNewArchiveFolder({ database });
    await fs.mkdir(path.join(archivedir(), archiveFolder));
    const model = await this.structure({ conid, database });
    await exportDbModel(model, path.join(archivedir(), archiveFolder));
    socket.emitChanged(`archive-folders-changed`);
    return { archiveFolder };
  },

  generateDeploySql_meta: true,
  async generateDeploySql({ conid, database, archiveFolder }, req) {
    testConnectionPermission(conid, req);
    const opened = await this.ensureOpened(conid, database);
    const res = await this.sendRequest(opened, {
      msgtype: 'generateDeploySql',
      modelFolder: resolveArchiveFolder(archiveFolder),
    });
    return res;

    // const connection = await connections.get({ conid });
    // return generateDeploySql({
    //   connection,
    //   analysedStructure: await this.structure({ conid, database }),
    //   modelFolder: resolveArchiveFolder(archiveFolder),
    // });

    // const deployedModel = generateDbPairingId(await importDbModel(path.join(archivedir(), archiveFolder)));
    // const currentModel = generateDbPairingId(await this.structure({ conid, database }));
    // const currentModelPaired = matchPairedObjects(deployedModel, currentModel);
    // const connection = await connections.get({ conid });
    // const driver = requireEngineDriver(connection);
    // const { sql } = getAlterDatabaseScript(currentModelPaired, deployedModel, {}, deployedModel, driver);
    // return {
    //   deployedModel,
    //   currentModel,
    //   currentModelPaired,
    //   sql,
    // };
    // return sql;
  },
  // runCommand_meta: true,
  // async runCommand({ conid, database, sql }) {
  //   console.log(`Running SQL command , conid=${conid}, database=${database}, sql=${sql}`);
  //   const opened = await this.ensureOpened(conid, database);
  //   const res = await this.sendRequest(opened, { msgtype: 'queryData', sql });
  //   return res;
  // },

  async getUnifiedDiff({ sourceConid, sourceDatabase, targetConid, targetDatabase }) {
    const dbDiffOptions = sourceConid == '__model' ? modelCompareDbDiffOptions : {};

    const sourceDb = generateDbPairingId(
      extendDatabaseInfo(await this.structure({ conid: sourceConid, database: sourceDatabase }))
    );
    const targetDb = generateDbPairingId(
      extendDatabaseInfo(await this.structure({ conid: targetConid, database: targetDatabase }))
    );
    // const sourceConnection = await connections.getCore({conid:sourceConid})
    const connection = await connections.getCore({ conid: targetConid });
    const driver = requireEngineDriver(connection);
    const targetDbPaired = matchPairedObjects(sourceDb, targetDb, dbDiffOptions);
    const diffRows = computeDbDiffRows(sourceDb, targetDbPaired, dbDiffOptions, driver);

    // console.log('sourceDb', sourceDb);
    // console.log('targetDb', targetDb);
    // console.log('sourceConid, sourceDatabase', sourceConid, sourceDatabase);

    let res = '';
    for (const row of diffRows) {
      // console.log('PAIR', row.source && row.source.pureName, row.target && row.target.pureName);
      const unifiedDiff = createTwoFilesPatch(
        (row.target && row.target.pureName) || '',
        (row.source && row.source.pureName) || '',
        getCreateObjectScript(row.target, driver),
        getCreateObjectScript(row.source, driver),
        '',
        ''
      );
      res += unifiedDiff;
    }
    return res;
  },

  generateDbDiffReport_meta: true,
  async generateDbDiffReport({ filePath, sourceConid, sourceDatabase, targetConid, targetDatabase }) {
    const unifiedDiff = await this.getUnifiedDiff({ sourceConid, sourceDatabase, targetConid, targetDatabase });

    const diffJson = parse(unifiedDiff);
    // $: diffHtml = html(diffJson, { outputFormat: 'side-by-side', drawFileList: false });
    const diffHtml = html(diffJson, { outputFormat: 'side-by-side' });

    await fs.writeFile(filePath, diff2htmlPage(diffHtml));

    return true;
  },
};
