const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const uuidv1 = require('uuid/v1');
const byline = require('byline');
const socket = require('../utility/socket');
const { fork } = require('child_process');
const { rundir, uploadsdir, pluginsdir } = require('../utility/directories');
const { extractShellApiPlugins, extractShellApiFunctionName } = require('dbgate-tools');
const { handleProcessCommunication } = require('../utility/processComm');

function extractPlugins(script) {
  const requireRegex = /\s*\/\/\s*@require\s+([^\s]+)\s*\n/g;
  const matches = [...script.matchAll(requireRegex)];
  return matches.map(x => x[1]);
}

const requirePluginsTemplate = plugins =>
  plugins
    .map(
      packageName => `const ${_.camelCase(packageName)} = require(process.env.PLUGIN_${_.camelCase(packageName)});\n`
    )
    .join('') + `dbgateApi.registerPlugins(${plugins.map(x => _.camelCase(x)).join(',')});\n`;

const scriptTemplate = script => `
const dbgateApi = require(process.env.DBGATE_API);
${requirePluginsTemplate(extractPlugins(script))}
require=null;
async function run() {
${script}
await dbgateApi.finalizer.run();
console.log('Finished job script');
}
dbgateApi.runScript(run);
`;

const loaderScriptTemplate = (functionName, props, runid) => `
const dbgateApi = require(process.env.DBGATE_API);
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
    if (message) console.log('...', message.message);
    if (_.isString(message)) {
      socket.emit(`runner-info-${runid}`, {
        message,
        time: new Date(),
        severity: 'info',
      });
    }
    if (_.isPlainObject(message)) {
      socket.emit(`runner-info-${runid}`, {
        time: new Date(),
        severity: 'info',
        ...message,
      });
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
    const pluginNames = fs.readdirSync(pluginsdir());
    console.log(`RUNNING SCRIPT ${scriptFile}`);
    // const subprocess = fork(scriptFile, ['--checkParent', '--max-old-space-size=8192'], {
    const subprocess = fork(scriptFile, ['--checkParent', ...process.argv.slice(3)], {
      cwd: directory,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: {
        DBGATE_API: process.argv[1],
        ..._.fromPairs(pluginNames.map(name => [`PLUGIN_${_.camelCase(name)}`, path.join(pluginsdir(), name)])),
      },
    });
    const pipeDispatcher = severity => data =>
      this.dispatchMessage(runid, { severity, message: data.toString().trim() });

    byline(subprocess.stdout).on('data', pipeDispatcher('info'));
    byline(subprocess.stderr).on('data', pipeDispatcher('error'));
    subprocess.on('exit', code => {
      this.rejectRequest(runid, { message: 'No data retured, maybe input data source is too big' });
      console.log('... EXIT process', code);
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
    return newOpened;
  },

  start_meta: 'post',
  async start({ script }) {
    const runid = uuidv1();
    return this.startCore(runid, scriptTemplate(script));
  },

  cancel_meta: 'post',
  async cancel({ runid }) {
    const runner = this.opened.find(x => x.runid == runid);
    if (!runner) {
      throw new Error('Invalid runner');
    }
    runner.subprocess.kill();
    return { state: 'ok' };
  },

  files_meta: 'get',
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

  loadReader_meta: 'post',
  async loadReader({ functionName, props }) {
    const promise = new Promise((resolve, reject) => {
      const runid = uuidv1();
      this.requests[runid] = [resolve, reject];
      this.startCore(runid, loaderScriptTemplate(functionName, props, runid));
    });
    return promise;
  },
};
