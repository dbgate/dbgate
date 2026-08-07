const crypto = require('crypto');
const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const byline = require('byline');
const socket = require('../utility/socket');
const { fork, spawn } = require('child_process');
const { rundir, uploadsdir, pluginsdir, getPluginBackendPath, packagedPluginList } = require('../utility/directories');
const {
  extractShellApiPlugins,
  compileShellApiFunctionName,
  jsonScriptToJavascript,
  assertValidShellApiFunctionName,
  getLogger,
  safeJsonParse,
  pinoLogRecordToMessageRecord,
  extractErrorMessage,
  extractErrorLogData,
} = require('dbgate-tools');
const { handleProcessCommunication } = require('../utility/processComm');
const processArgs = require('../utility/processArgs');
const platformInfo = require('../utility/platformInfo');
const { checkSecureDirectories, checkSecureDirectoriesInScript } = require('../utility/security');
const { sendToAuditLog, logJsonRunnerScript } = require('../utility/auditlog');
const { testStandardPermission } = require('../utility/hasPermission');
const logger = getLogger('runners');

function extractPlugins(script) {
  // Anchored to a true line start so a directive can only ever come from a comment line the
  // generator itself emitted, not from user-controlled text that merely contains the substring
  // "// @require ..." elsewhere on a line. Uses the zero-width multiline '^' rather than an
  // "(?:^|\n)" alternation - the latter consumes the previous line's '\n' as part of its match,
  // so with several directives on consecutive lines, matching resumes mid-line and every other
  // directive is skipped. '\r?' tolerates CRLF line endings. '\uFEFF?' tolerates a leading
  // BOM in hand-authored scripts.
  const requireRegex = /^\uFEFF?[ \t]*\/\/[ \t]*@require[ \t]+(\S+)[ \t]*\r?\n/gm;
  const matches = [...script.matchAll(requireRegex)];
  return matches.map(x => x[1]);
}

const requirePluginsTemplate = (plugins, isExport) =>
  plugins
    .map(
      packageName =>
        `const ${_.camelCase(packageName)} = require(${
          isExport ? `'${packageName}'` : `process.env.PLUGIN_${_.camelCase(packageName)}`
        });\n`
    )
    .join('') + `dbgateApi.registerPlugins(${plugins.map(x => _.camelCase(x)).join(',')});\n`;

const scriptTemplate = (script, isExport) => `
const dbgateApi = require(${isExport ? `'dbgate-api'` : 'process.env.DBGATE_API'});
const logger = dbgateApi.getLogger('script');
dbgateApi.initializeApiEnvironment();
${requirePluginsTemplate(extractPlugins(script), isExport)}
require=null;
async function run() {
${script}
await dbgateApi.finalizer.run();
logger.info('DBGM-00014 Finished job script');
}
dbgateApi.runScript(run);
`;

const loaderScriptTemplate = (functionName, props, runid) => {
  const plugins = extractShellApiPlugins(functionName, props);
  const prefix = plugins.map(packageName => `// @require ${packageName}\n`).join('');
  return `
${prefix}
const dbgateApi = require(process.env.DBGATE_API);
dbgateApi.initializeApiEnvironment();
${requirePluginsTemplate(plugins)}
require=null;
async function run() {
const reader=await ${compileShellApiFunctionName(functionName)}(${JSON.stringify(props)});
const writer=await dbgateApi.collectorWriter({runid: ${JSON.stringify(runid)}});
await dbgateApi.copyStream(reader, writer);
}
dbgateApi.runScript(run);
`;
};

module.exports = {
  /** @type {import('dbgate-types').OpenedRunner[]} */
  opened: [],
  requests: {},

  dispatchMessage(runid, message) {
    if (message) {
      if (_.isPlainObject(message))
        logger.log({ ...message, msg: message.msg || message.message || '', message: undefined });
      else logger.info(message);

      const toEmit = _.isPlainObject(message)
        ? {
            time: new Date(),
            ...message,
          }
        : {
            message,
            severity: 'info',
            time: new Date(),
          };

      if (toEmit.level >= 50) {
        toEmit.severity = 'error';
      }

      socket.emit(`runner-info-${runid}`, toEmit);
    }
  },

  handle_ping() {},

  handle_dataResult(runid, { dataResult }) {
    const { resolve } = this.requests[runid];
    resolve(dataResult);
    delete this.requests[runid];
  },

  handle_copyStreamError(runid, { copyStreamError }) {
    const { reject, exitOnStreamError } = this.requests[runid] || {};
    if (exitOnStreamError) {
      reject(copyStreamError);
      delete this.requests[runid];
    }
  },

  handle_progress(runid, progressData) {
    socket.emit(`runner-progress-${runid}`, progressData);
  },

  rejectRequest(runid, error) {
    if (this.requests[runid]) {
      const { reject } = this.requests[runid];
      reject(error);
      delete this.requests[runid];
    }
  },

  startCore(runid, scriptText) {
    const directory = path.join(rundir(), runid);
    const scriptFile = path.join(uploadsdir(), runid + '.js');
    fs.writeFileSync(`${scriptFile}`, scriptText);
    fs.mkdirSync(directory);
    const pluginNames = extractPlugins(scriptText);
    // console.log('********************** SCRIPT TEXT **********************');
    // console.log(scriptText);
    logger.info({ scriptFile }, 'DBGM-00015 Running script');
    // const subprocess = fork(scriptFile, ['--checkParent', '--max-old-space-size=8192'], {
    const subprocess = fork(
      scriptFile,
      [
        '--checkParent', // ...process.argv.slice(3)
        '--is-forked-api',
        '--process-display-name',
        'script',
        ...processArgs.getPassArgs(),
      ],
      {
        cwd: directory,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        env: {
          ...process.env,
          DBGATE_API: global['API_PACKAGE'] || process.argv[1],
          ..._.fromPairs(pluginNames.map(name => [`PLUGIN_${_.camelCase(name)}`, getPluginBackendPath(name)])),
        },
      }
    );
    const pipeDispatcher = severity => data => {
      const json = safeJsonParse(data, null);

      if (json) {
        return this.dispatchMessage(runid, pinoLogRecordToMessageRecord(json));
      } else {
        return this.dispatchMessage(runid, {
          message: json == null ? data.toString().trim() : null,
          severity,
        });
      }
    };

    byline(subprocess.stdout).on('data', pipeDispatcher('info'));
    byline(subprocess.stderr).on('data', pipeDispatcher('error'));
    subprocess.on('exit', code => {
      // console.log('... EXITED', code);
      this.rejectRequest(runid, { message: 'DBGM-00281 No data returned, maybe input data source is too big' });
      logger.info({ code, pid: subprocess.pid }, 'DBGM-00016 Exited process');
      socket.emit(`runner-done-${runid}`, code);
      this.opened = this.opened.filter(x => x.runid != runid);
    });
    subprocess.on('error', error => {
      // console.log('... ERROR subprocess', error);
      this.rejectRequest(runid, { message: error && (error.message || error.toString()) });
      console.error('... ERROR subprocess', error);
      this.dispatchMessage(runid, {
        severity: 'error',
        message: error.toString(),
      });
      this.opened = this.opened.filter(x => x.runid != runid);
    });
    const newOpened = {
      runid,
      subprocess,
    };
    this.opened.push(newOpened);
    subprocess.on('message', message => {
      // @ts-ignore
      const { msgtype } = message;
      if (handleProcessCommunication(message, subprocess)) return;
      if (msgtype === 'get-volatile-connection') {
        const connections = require('./connections');
        // @ts-ignore
        const conid = message.conid;
        if (!conid || typeof conid !== 'string') return;
        const trySend = payload => {
          if (!subprocess.connected) return;
          try {
            subprocess.send(payload);
          } catch {
            // child disconnected between the check and the send — ignore
          }
        };
        connections.getCore({ conid }).then(conn => {
          trySend({ msgtype: 'volatile-connection-response', conid, conn: conn?.unsaved ? conn : null });
        }).catch(err => {
          logger.error({ ...extractErrorLogData(err), conid }, 'DBGM-00337 Error resolving volatile connection for child process');
          trySend({ msgtype: 'volatile-connection-response', conid, conn: null });
        });
        return;
      }
      this[`handle_${msgtype}`](runid, message);
    });
    return _.pick(newOpened, ['runid']);
  },

  nativeRunCore(runid, commandArgs) {
    const { command, args, env, transformMessage, stdinFilePath, onFinished } = commandArgs;
    const pipeDispatcher = severity => data => {
      let messageObject = {
        message: data.toString().trim(),
        severity,
      };
      if (transformMessage) {
        messageObject = transformMessage(messageObject);
      }

      if (messageObject) {
        return this.dispatchMessage(runid, messageObject);
      }
    };

    const subprocess = spawn(command, args, { env: { ...process.env, ...env } });
    let finished = false;

    const finish = code => {
      if (finished) return;
      finished = true;
      socket.emit(`runner-done-${runid}`, code);
      if (onFinished) {
        Promise.resolve(onFinished()).catch(error => {
          logger.error(extractErrorLogData(error), 'DBGM-00338 Error finalizing external process');
        });
      }
      this.opened = this.opened.filter(x => x.runid != runid);
    };

    byline(subprocess.stdout).on('data', pipeDispatcher('info'));
    byline(subprocess.stderr).on('data', pipeDispatcher('error'));

    subprocess.on('exit', code => {
      console.log('... EXITED', code);
      logger.info({ code, pid: subprocess.pid }, 'DBGM-00017 Exited process');
      this.dispatchMessage(runid, `DBGM-00282 Finished external process with code ${code}`);
      finish(code);
    });
    subprocess.on('spawn', () => {
      this.dispatchMessage(runid, `DBGM-00283 Started external process ${command}`);
    });
    subprocess.on('error', error => {
      console.log('... ERROR subprocess', error);
      this.dispatchMessage(runid, {
        severity: 'error',
        message: error.toString(),
      });
      if (error['code'] == 'ENOENT') {
        this.dispatchMessage(runid, {
          severity: 'error',
          message: `Command ${command} not found, please install it and configure its location in DbGate settings, Settings/External tools, if ${command} is not in system PATH`,
        });
      }
      finish(1);
    });

    if (stdinFilePath) {
      const inputStream = fs.createReadStream(stdinFilePath);
      inputStream.pipe(subprocess.stdin);

      subprocess.stdin.on('error', err => {
        this.dispatchMessage(runid, {
          severity: 'error',
          message: extractErrorMessage(err),
        });
        logger.error(extractErrorLogData(err), 'DBGM-00118 Caught error on stdin');
      });
    }

    const newOpened = {
      runid,
      subprocess,
    };
    this.opened.push(newOpened);
    return _.pick(newOpened, ['runid']);
  },

  promiseRunCore(runid, callback, onFinished, operation = 'operation') {
    const abortController = new AbortController();
    const newOpened = {
      runid,
      cancel: () => abortController.abort(),
    };
    this.opened.push(newOpened);

    this.dispatchMessage(runid, `DBGM-00339 Started internal ${operation} process`);

    Promise.resolve()
      .then(() =>
        callback({
          signal: abortController.signal,
          info: message => this.dispatchMessage(runid, message),
        })
      )
      .then(() => {
        this.dispatchMessage(runid, `DBGM-00340 Finished internal ${operation} process`);
        socket.emit(`runner-done-${runid}`, { status: 'finished', exitCode: 0 });
      })
      .catch(error => {
        const cancelled = abortController.signal.aborted;
        this.dispatchMessage(runid, {
          severity: cancelled ? 'info' : 'error',
          message: extractErrorMessage(error),
        });
        socket.emit(`runner-done-${runid}`, {
          status: cancelled ? 'cancelled' : 'failed',
          exitCode: cancelled ? null : 1,
        });
      })
      .finally(() => {
        if (onFinished) {
          onFinished();
        }
        this.opened = this.opened.filter(x => x.runid != runid);
      });

    return _.pick(newOpened, ['runid']);
  },

  start_meta: true,
  async start({ script }, req) {
    const runid = crypto.randomUUID();

    if (script.type == 'json') {
      if (!platformInfo.isElectron) {
        if (!checkSecureDirectoriesInScript(script)) {
          return { errorMessage: 'DBGM-00284 Unallowed directories in script' };
        }
      }

      logJsonRunnerScript(req, script);

      const js = await jsonScriptToJavascript(script);
      return this.startCore(runid, scriptTemplate(js, false));
    }

    await testStandardPermission('run-shell-script', req);

    if (!platformInfo.allowShellScripting) {
      sendToAuditLog(req, {
        category: 'shell',
        component: 'RunnersController',
        event: 'script.runFailed',
        action: 'script',
        severity: 'warn',
        detail: script,
        message: 'DBGM-00285 Scripts are not allowed',
      });

      return { errorMessage: 'DBGM-00286 Shell scripting is not allowed' };
    }

    sendToAuditLog(req, {
      category: 'shell',
      component: 'RunnersController',
      event: 'script.run.shell',
      action: 'script',
      severity: 'info',
      detail: script,
      message: 'DBGM-00287 Running JS script',
    });

    return this.startCore(runid, scriptTemplate(script, false));
  },

  getNodeScript_meta: true,
  async getNodeScript({ script }) {
    return scriptTemplate(script, true);
  },

  cancel_meta: true,
  async cancel({ runid }) {
    const runner = this.opened.find(x => x.runid == runid);
    if (!runner) {
      throw new Error('DBGM-00288 Invalid runner');
    }
    if (runner.subprocess) {
      runner.subprocess.kill();
    } else if (runner.cancel) {
      await runner.cancel();
    }
    return { state: 'ok' };
  },

  files_meta: true,
  async files({ runid }) {
    const directory = path.join(rundir(), runid);
    const files = await fs.readdir(directory);
    const res = [];
    for (const file of files) {
      const stat = await fs.stat(path.join(directory, file));
      res.push({
        name: file,
        size: stat.size,
        path: path.join(directory, file),
      });
    }
    return res;
  },

  loadReader_meta: true,
  async loadReader({ functionName, props }) {
    if (!platformInfo.isElectron) {
      if (props?.fileName && !checkSecureDirectories(props.fileName)) {
        return { errorMessage: 'DBGM-00289 Unallowed file' };
      }
    }

    const promise = new Promise((resolve, reject) => {
      assertValidShellApiFunctionName(functionName);
      const runid = crypto.randomUUID();
      this.requests[runid] = { resolve, reject, exitOnStreamError: true };
      this.startCore(runid, loaderScriptTemplate(functionName, props, runid));
    });
    return promise;
  },

  scriptResult_meta: true,
  async scriptResult({ script }) {
    if (script.type != 'json') {
      return { errorMessage: 'DBGM-00290 Only JSON scripts are allowed' };
    }

    const promise = new Promise(async (resolve, reject) => {
      const runid = crypto.randomUUID();
      this.requests[runid] = { resolve, reject, exitOnStreamError: true };
      const cloned = _.cloneDeepWith(script, node => {
        if (node?.$replace == 'runid') {
          return runid;
        }
      });
      const js = await jsonScriptToJavascript(cloned);
      this.startCore(runid, scriptTemplate(js, false));
    });
    return promise;
  },
};
