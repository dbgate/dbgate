const crypto = require('crypto');
const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const byline = require('byline');
const socket = require('../utility/socket');
const { fork } = require('child_process');
const { rundir, uploadsdir, pluginsdir, getPluginBackendPath, packagedPluginList } = require('../utility/directories');
const {
  extractShellApiPlugins,
  extractShellApiFunctionName,
  jsonScriptToJavascript,
  getLogger,
  safeJsonParse,
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

const loaderScriptTemplate = (functionName, props, runid) => `
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
      const json = safeJsonParse(message.message);

      if (json) logger.log(json);
      else logger.info(message.message);

      const toEmit = {
        time: new Date(),
        ...message,
        message: json ? json.msg : message.message,
      };

      if (json && json.level >= 50) {
        toEmit.severity = 'error';
      }

      socket.emit(`runner-info-${runid}`, toEmit);
    }
  },

  handle_ping() {},

  handle_freeData(runid, { freeData }) {
    const [resolve, reject] = this.requests[runid];
    resolve(freeData);
    delete this.requests[runid];
  },

  rejectRequest(runid, error) {
    if (this.requests[runid]) {
      const [resolve, reject] = this.requests[runid];
      reject(error);
      delete this.requests[runid];
    }
  },

  startCore(runid, scriptText) {
    const directory = path.join(rundir(), runid);
    const scriptFile = path.join(uploadsdir(), runid + '.js');
    fs.writeFileSync(`${scriptFile}`, scriptText);
    fs.mkdirSync(directory);
    const pluginNames = _.union(fs.readdirSync(pluginsdir()), packagedPluginList);
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
      return this.dispatchMessage(runid, { severity, message: data.toString().trim() });
    };

    byline(subprocess.stdout).on('data', pipeDispatcher('info'));
    byline(subprocess.stderr).on('data', pipeDispatcher('error'));
    subprocess.on('exit', code => {
      this.rejectRequest(runid, { message: 'No data retured, maybe input data source is too big' });
      logger.info({ code, pid: subprocess.pid }, 'Exited process');
      socket.emit(`runner-done-${runid}`, code);
    });
    subprocess.on('error', error => {
      this.rejectRequest(runid, { message: error && (error.message || error.toString()) });
      console.error('... ERROR subprocess', error);
      this.dispatchMessage({
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

  start_meta: true,
  async start({ script }) {
    const runid = crypto.randomUUID()

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
    const promise = new Promise((resolve, reject) => {
      const runid = crypto.randomUUID();
      this.requests[runid] = [resolve, reject];
      this.startCore(runid, loaderScriptTemplate(functionName, props, runid));
    });
    return promise;
  },
};
