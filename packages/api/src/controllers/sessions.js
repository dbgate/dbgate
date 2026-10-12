const crypto = require('crypto');
const _ = require('lodash');
const connections = require('./connections');
const socket = require('../utility/socket');
const { fork } = require('child_process');
const jsldata = require('./jsldata');
const path = require('path');
const { handleProcessCommunication } = require('../utility/processComm');
const processArgs = require('../utility/processArgs');
const { appdir } = require('../utility/directories');
const { getLogger, extractErrorLogData, removeSqlFrontMatter } = require('dbgate-tools');
const pipeForkLogs = require('../utility/pipeForkLogs');
const config = require('./config');
const { sendToAuditLog } = require('../utility/auditlog');
const {
  testStandardPermission,
  testDatabaseRolePermission,
  testConnectionPermission,
} = require('../utility/hasPermission');
const { verifyTeamFileExecToken } = require('../utility/teamFileExecToken');
const requireEngineDriver = require('../utility/requireEngineDriver');

const logger = getLogger('sessions');

// A team-file grant is checked against the statement with its front matter removed (see
// hashTeamFileContent), but the front matter block is not required to hold only comments - so
// the text that runs under a grant is the one that was checked. The block is blanked out rather
// than cut, so that line numbers in messages still match the editor.
function blankOutSqlFrontMatter(sql) {
  if (typeof sql != 'string') return sql;
  const body = removeSqlFrontMatter(sql) ?? '';
  const frontMatterBlock = sql.substring(0, sql.length - body.length);
  return frontMatterBlock.replace(/[^\n]/g, '') + body;
}

// events of a session go to the browser tab that opened it (socket.emitOwned)
const sessionOwnerKey = sesid => socket.sessionOwnerKey(sesid);

// a name of an app folder or of a query in it, which becomes part of a path under appdir();
// "." is refused too, so an app query always lives in a real app folder, not in the appdir() root
function isSafeAppFileName(name) {
  return typeof name == 'string' && name.length > 0 && name != '.' && !/[\\/\0]|\.\./.test(name);
}

module.exports = {
  /** @type {import('dbgate-types').OpenedSession[]} */
  opened: [],
  requests: {},

  // handle_error(sesid, props) {
  //   const { error } = props;
  //   console.log(`Error in database session ${sesid}`, error);
  //   this.dispatchMessage(sesid, {
  //     severity: 'error',
  //     message: error && error.toString(),
  //   });
  // },

  // handle_row(sesid, props) {
  //   const { row } = props;
  //   socket.emit('sessionRow', row);
  // },
  dispatchMessage(sesid, message) {
    if (_.isString(message)) {
      socket.emitOwned(sessionOwnerKey(sesid), `session-info-${sesid}`, {
        message,
        time: new Date(),
        severity: 'info',
      });
    }
    if (_.isPlainObject(message)) {
      socket.emitOwned(sessionOwnerKey(sesid), `session-info-${sesid}`, {
        time: new Date(),
        severity: 'info',
        ...message,
      });
    }
  },

  handle_info(sesid, props) {
    const { info } = props;
    this.dispatchMessage(sesid, info);
  },

  handle_done(sesid, props) {
    socket.emitOwned(sessionOwnerKey(sesid), `session-done-${sesid}`);
    if (!props.skipFinishedMessage) {
      if (props.controlCommand) {
        this.dispatchMessage(sesid, `${_.startCase(props.controlCommand)} finished`);
      } else {
        this.dispatchMessage(sesid, 'Query execution finished');
      }
    }
    const session = this.opened.find(x => x.sesid == sesid);
    if (session.loadingReader_jslid) {
      socket.emitOwned(sessionOwnerKey(sesid), `session-jslid-done-${session.loadingReader_jslid}`);
    }
    if (props.autoCommit) {
      this.executeControlCommand({ sesid, command: 'commitTransaction' });
    }
    if (session.killOnDone) {
      this.kill({ sesid });
    }
  },

  handle_recordset(sesid, props) {
    const { jslid, resultIndex } = props;
    socket.emitOwned(sessionOwnerKey(sesid), `session-recordset-${sesid}`, { jslid, resultIndex });
  },

  handle_endrecordset(sesid, props) {
    const { jslid, rowCount, durationMs } = props;
    this.dispatchMessage(sesid, {
      message: `Query returned ${rowCount} rows in ${durationMs} ms`,
      rowCount,
      durationMs,
      jslid,
    });
  },

  handle_stats(sesid, stats) {
    jsldata.notifyChangedStats(stats);
  },

  handle_charts(sesid, props) {
    const { jslid, charts, resultIndex } = props;
    socket.emitOwned(sessionOwnerKey(sesid), `session-charts-${sesid}`, { jslid, resultIndex, charts });
  },

  handle_initializeFile(sesid, props) {
    const { jslid } = props;
    socket.emitOwned(sessionOwnerKey(sesid), `session-initialize-file-${jslid}`);
  },

  handle_changedCurrentDatabase(sesid, props) {
    const { database } = props;
    this.dispatchMessage(sesid, `Current database changed to ${database}`);
    socket.emitOwned(sessionOwnerKey(sesid), `session-changedb-${sesid}`, { database });
  },

  handle_ping() {},

  handle_response(sesid, props) {
    const { msgid } = props;
    const request = this.requests[msgid];
    if (!request) return;
    delete this.requests[msgid];
    request.resolve(_.omit(props, ['msgtype', 'msgid', 'sesid']));
  },

  sendRequest(session, message) {
    const msgid = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        session.subprocess.off('exit', handleExit);
        delete this.requests[msgid];
      };
      const handleExit = () => {
        cleanup();
        reject(new Error('DBGM-00341 Session process exited before response was received'));
      };
      this.requests[msgid] = {
        resolve: value => {
          cleanup();
          resolve(value);
        },
        reject: error => {
          cleanup();
          reject(error);
        },
      };
      session.subprocess.once('exit', handleExit);
      session.subprocess.send({ ...message, msgid }, err => {
        if (err && this.requests[msgid]) {
          this.requests[msgid].reject(err);
        }
      });
    });
  },

  create_meta: true,
  async create({ conid, database }, req) {
    // connections.getCore performs no authorization of its own, and the session subprocess it
    // feeds is opened with the connection's full credentials, so the check has to happen here.
    await testConnectionPermission(conid, req);
    const sesid = crypto.randomUUID();
    const connection = await connections.getCore({ conid });
    const globalSettings = await config.getSettings();
    const subprocess = fork(
      global['API_PACKAGE'] || process.argv[1],
      [
        '--is-forked-api',
        '--start-process',
        'sessionProcess',
        ...processArgs.getPassArgs(),
        // ...process.argv.slice(3),
      ],
      {
        env: {
          ...process.env,
          NODE_NO_WARNINGS: globalSettings?.['behaviour.useDiagnosticTools'] === true ? '0' : '1',
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      }
    );
    pipeForkLogs(subprocess);
    const newOpened = {
      conid,
      database,
      subprocess,
      connection,
      sesid,
    };
    this.opened.push(newOpened);
    socket.setOwner(sessionOwnerKey(sesid), socket.getStrmidFromRequest(req));
    subprocess.on('message', message => {
      // @ts-ignore
      const { msgtype } = message;
      if (handleProcessCommunication(message, subprocess)) return;
      this[`handle_${msgtype}`](sesid, message);
    });
    subprocess.on('exit', () => {
      this.opened = this.opened.filter(x => x.sesid != sesid);
      this.dispatchMessage(sesid, 'Query session closed');
      socket.emitOwned(sessionOwnerKey(sesid), `session-closed-${sesid}`);
      socket.removeOwner(sessionOwnerKey(sesid));
    });
    subprocess.on('error', () => {
      this.opened = this.opened.filter(x => x.sesid != sesid);
    });

    subprocess.send({
      msgtype: 'connect',
      ...connection,
      database,
      globalSettings,
    });
    return _.pick(newOpened, ['conid', 'database', 'sesid']);
  },

  executeQuery_meta: true,
  async executeQuery({ sesid, sql, autoCommit, autoDetectCharts, limitRows, frontMatter }, req) {
    // The session is resolved first because a team-file execution grant is only good for the
    // connection and database the file pins, so it cannot be checked without knowing which
    // session the statement would run in.
    const session = this.opened.find(x => x.sesid == sesid);
    if (!session) {
      throw new Error('Invalid session');
    }

    // A valid grant means this exact statement was handed to this exact caller by
    // teamFiles.getContent, which already checked their "use" access to the file - that is what
    // lets an autoExecute team file run for a user who may not read it. The grant carries the
    // team file it came from as a claim, so execGrantStillStands reloads that file and derives
    // the access again rather than trusting it.
    const grant = verifyTeamFileExecToken(frontMatter?.useToken, sql, req, session);
    const standing = grant && (await require('./teamFiles').execGrantStillStands(grant.teamFileId, sql, session, req));

    if (!standing) {
      await testStandardPermission('dbops/query', req);
    }

    // Only a file pinned to this connection and database stands in for the database role. A file
    // that pins none says nothing about where it may run, so the role is still required and the
    // caller cannot spend the grant on a database they do not already hold it for.
    //
    // The answer comes from execGrantStillStands, which reads the file as it stands now, and not
    // from the token: a grant minted while the file was pinned carries that claim for its whole
    // lifetime, and unpinning the file has to take the bypass away immediately.
    if (!standing || !standing.isTargetBound) {
      await testDatabaseRolePermission(session.conid, session.database, 'run_script', req);
    }

    sendToAuditLog(req, {
      category: 'dbop',
      component: 'SessionController',
      action: 'executeQuery',
      event: 'query.execute',
      severity: 'info',
      detail: sql,
      conid: session.conid,
      database: session.database,
      message: 'Executing query',
    });

    logger.info({ sesid, sql }, 'DBGM-00019 Processing query');
    this.dispatchMessage(sesid, {
      message: 'Query execution started',
      sql,
    });
    let dbinfo = null;
    try {
      dbinfo = (await require('./databaseConnections').ensureOpened(session.conid, session.database))?.structure;
    } catch (err) {
      logger.warn(extractErrorLogData(err), 'DBGM-00342 Error loading structure for query result metadata');
    }
    session.subprocess.send({
      msgtype: 'executeQuery',
      sql: standing ? blankOutSqlFrontMatter(sql) : sql,
      autoCommit,
      autoDetectCharts: autoDetectCharts || !!frontMatter?.['selected-chart'],
      limitRows,
      frontMatter,
      dbinfo,
    });

    return { state: 'ok' };
  },

  executeControlCommand_meta: true,
  async executeControlCommand({ sesid, command }) {
    const session = this.opened.find(x => x.sesid == sesid);
    if (!session) {
      throw new Error('Invalid session');
    }

    logger.info({ sesid, command }, 'DBGM-00020 Processing control command');
    this.dispatchMessage(sesid, `${_.startCase(command)} started`);
    session.subprocess.send({ msgtype: 'executeControlCommand', command });

    return { state: 'ok' };
  },

  saveQueryResultData_meta: true,
  async saveQueryResultData({ sesid, changeSet, sql, autoCommit }, req) {
    await testStandardPermission('dbops/query', req);
    const session = this.opened.find(x => x.sesid == sesid);
    if (!session) {
      throw new Error('Invalid session');
    }
    await testDatabaseRolePermission(session.conid, session.database, 'run_script', req);

    const res = await this.sendRequest(session, { msgtype: 'saveQueryResultData', changeSet, sql, autoCommit });
    if (res.errorMessage) {
      return {
        errorMessage: res.errorMessage,
      };
    }
    return res.result || { state: 'ok' };
  },

  setIsolationLevel_meta: true,
  async setIsolationLevel({ sesid, level }) {
    const session = this.opened.find(x => x.sesid == sesid);
    if (!session) {
      throw new Error('Invalid session');
    }

    logger.info({ sesid, level }, 'DBGM-00315 Setting transaction isolation level');
    session.subprocess.send({ msgtype: 'setIsolationLevel', level });

    return { state: 'ok' };
  },

  executeReader_meta: true,
  async executeReader({ conid, database, sql, queryName, appFolder }, req) {
    await testConnectionPermission(conid, req);
    // The query is read from the app folder only when both are given (see fileName below). App
    // queries from the object list send just queryName (the label) together with their sql.
    const isAppQuery = !!(queryName && appFolder);
    if (isAppQuery && (!isSafeAppFileName(queryName) || !isSafeAppFileName(appFolder))) {
      throw new Error('DBGM-00000 Invalid query name');
    }
    // The data grid uses this to fetch all rows of what it shows, so reading the data is enough for
    // SQL. Drivers of document databases (MongoDB, ...) evaluate the query text as JavaScript in
    // DbGate itself, which is running a script, so they need what sessions.executeQuery needs.
    // That holds for app queries as well - the app file is not trusted code (its text is
    // evaluated the same way).
    const driver = requireEngineDriver(await connections.getCore({ conid }));
    if (driver?.databaseEngineTypes?.includes('document')) {
      await testStandardPermission('dbops/query', req);
      await testDatabaseRolePermission(conid, database, 'run_script', req);
    } else {
      await testDatabaseRolePermission(conid, database, 'read_content', req);
    }

    const { sesid } = await this.create({ conid, database }, req);
    const session = this.opened.find(x => x.sesid == sesid);
    session.killOnDone = true;
    const jslid = crypto.randomUUID();
    session.loadingReader_jslid = jslid;
    const fileName = queryName && appFolder ? path.join(appdir(), appFolder, `${queryName}.query.sql`) : null;

    session.subprocess.send({ msgtype: 'executeReader', sql, fileName, jslid });

    return { jslid };
  },

  stopLoadingReader_meta: true,
  async stopLoadingReader({ jslid }) {
    const session = this.opened.find(x => x.loadingReader_jslid == jslid);
    if (session) {
      this.kill({ sesid: session.sesid });
    }
    return true;
  },

  startProfiler_meta: true,
  async startProfiler({ sesid }) {
    const jslid = crypto.randomUUID();
    const session = this.opened.find(x => x.sesid == sesid);
    if (!session) {
      throw new Error('Invalid session');
    }

    logger.info({ sesid }, 'DBGM-00021 Starting profiler');
    session.loadingReader_jslid = jslid;
    session.subprocess.send({ msgtype: 'startProfiler', jslid });

    return { state: 'ok', jslid };
  },

  stopProfiler_meta: true,
  async stopProfiler({ sesid }) {
    const session = this.opened.find(x => x.sesid == sesid);
    if (!session) {
      throw new Error('Invalid session');
    }
    session.subprocess.send({ msgtype: 'stopProfiler' });
    return { state: 'ok' };
  },

  // cancel_meta: true,
  // async cancel({ sesid }) {
  //   const session = this.opened.find((x) => x.sesid == sesid);
  //   if (!session) {
  //     throw new Error('Invalid session');
  //   }
  //   session.subprocess.send({ msgtype: 'cancel' });
  //   return { state: 'ok' };
  // },

  kill_meta: true,
  async kill({ sesid }) {
    const session = this.opened.find(x => x.sesid == sesid);
    if (!session) {
      throw new Error('Invalid session');
    }
    session.subprocess.kill();
    this.dispatchMessage(sesid, 'Connection closed');
    return { state: 'ok' };
  },

  ping_meta: true,
  async ping({ sesid }) {
    const session = this.opened.find(x => x.sesid == sesid);
    if (!session) {
      return { state: 'missing' };
    }
    try {
      session.subprocess.send({ msgtype: 'ping' });
    } catch (err) {
      logger.error(extractErrorLogData(err), 'DBGM-00145 Error pinging session');

      return {
        state: 'missing',
        message: 'Ping failed',
      };
    }

    return { state: 'ok' };
  },

  // runCommand_meta: true,
  // async runCommand({ conid, database, sql }) {
  //   console.log(`Running SQL command , conid=${conid}, database=${database}, sql=${sql}`);
  //   const opened = await this.ensureOpened(conid, database);
  //   const res = await this.sendRequest(opened, { msgtype: 'queryData', sql });
  //   return res;
  // },
};
