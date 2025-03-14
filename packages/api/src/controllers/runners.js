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
  extractShellApiFunctionName,
  jsonScriptToJavascript,
  getLogger,
  safeJsonParse,
  pinoLogRecordToMessageRecord,
  extractErrorMessage,
  extractErrorLogData,
} = require('dbgate-tools');
const { handleProcessCommunication } = require('../utility/processComm');
const processArgs = require('../utility/processArgs');
const platformInfo = require('../utility/platformInfo');
const logger = getLogger('runners');

function extractPlugins(script) {
  const requireRegex = /\s*\/\/\s*@require\s+([^\s]+)\s*\n/g;
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
logger.info('Finished job script');
}
dbgateApi.runScript(run);
`;

const loaderScriptTemplate = (prefix, functionName, props, runid) => `
${prefix}
const dbgateApi = require(process.env.DBGATE_API);
dbgateApi.initializeApiEnvironment();
${requirePluginsTemplate(extractShellApiPlugins(functionName, props))}
require=null;
async function run() {
const reader=await ${extractShellApiFunctionName(functionName)}(${JSON.stringify(props)});
const writer=await dbgateApi.collectorWriter({runid: '${runid}'});
await dbgateApi.copyStream(reader, writer);
}
dbgateApi.runScript(run);
`;

module.exports = {
  /** @type {import('dbgate-types').OpenedRunner[]} */
  opened: [],
  requests: {},

  dispatchMessage(runid, message) {
    if (message) {
      if (_.isPlainObject(message)) logger.log(message);
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

  handle_freeData(runid, { freeData }) {
    const { resolve } = this.requests[runid];
    resolve(freeData);
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
    logger.info({ scriptFile }, 'Running script');
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
      this.rejectRequest(runid, { message: 'No data returned, maybe input data source is too big' });
      logger.info({ code, pid: subprocess.pid }, 'Exited process');
      socket.emit(`runner-done-${runid}`, code);
    });
    subprocess.on('error', error => {
      // console.log('... ERROR subprocess', error);
      this.rejectRequest(runid, { message: error && (error.message || error.toString()) });
      console.error('... ERROR subprocess', error);
      this.dispatchMessage(runid, {
        severity: 'error',
        message: error.toString(),
      });
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

    byline(subprocess.stdout).on('data', pipeDispatcher('info'));
    byline(subprocess.stderr).on('data', pipeDispatcher('error'));

    subprocess.on('exit', code => {
      console.log('... EXITED', code);
      logger.info({ code, pid: subprocess.pid }, 'Exited process');
      this.dispatchMessage(runid, `Finished external process with code ${code}`);
      socket.emit(`runner-done-${runid}`, code);
      if (onFinished) {
        onFinished();
      }
    });
    subprocess.on('spawn', () => {
      this.dispatchMessage(runid, `Started external process ${command}`);
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
      socket.emit(`runner-done-${runid}`);
    });

    if (stdinFilePath) {
      const inputStream = fs.createReadStream(stdinFilePath);
      inputStream.pipe(subprocess.stdin);

      subprocess.stdin.on('error', err => {
        this.dispatchMessage(runid, {
          severity: 'error',
          message: extractErrorMessage(err),
        });
        logger.error(extractErrorLogData(err), 'Caught error on stdin');
      });
    }

    const newOpened = {
      runid,
      subprocess,
    };
    this.opened.push(newOpened);
    return _.pick(newOpened, ['runid']);
  },

  start_meta: true,
  async start({ script }) {
    const runid = crypto.randomUUID();

    if (script.type == 'json') {
      const js = jsonScriptToJavascript(script);
      return this.startCore(runid, scriptTemplate(js, false));
    }

    if (!platformInfo.allowShellScripting) {
      return { errorMessage: 'Shell scripting is not allowed' };
    }

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
      throw new Error('Invalid runner');
    }
    runner.subprocess.kill();
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
    const prefix = extractShellApiPlugins(functionName)
      .map(packageName => `// @require ${packageName}\n`)
      .join('');

    const promise = new Promise((resolve, reject) => {
      const runid = crypto.randomUUID();
      this.requests[runid] = { resolve, reject, exitOnStreamError: true };
      this.startCore(runid, loaderScriptTemplate(prefix, functionName, props, runid));
    });
    return promise;
  },
};
