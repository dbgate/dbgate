const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const uuidv1 = require('uuid/v1');
const byline = require('byline');
const socket = require('../utility/socket');
const { fork } = require('child_process');
const { rundir, uploadsdir } = require('../utility/directories');

const scriptTemplate = (script) => `
const dbgateApi = require(process.env.DBGATE_API || "@dbgate/api");
require=null;
async function run() {
${script}
}
dbgateApi.runScript(run);
`;

module.exports = {
  /** @type {import('@dbgate/types').OpenedRunner[]} */
  opened: [],

  dispatchMessage(runid, message) {
    // console.log('DISPATCHING', message);
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

  start_meta: 'post',
  async start({ script }) {
    const runid = uuidv1();
    const directory = path.join(rundir(), runid);
    const scriptFile = path.join(uploadsdir(), runid + '.js');
    fs.writeFileSync(`${scriptFile}`, scriptTemplate(script));
    fs.mkdirSync(directory);
    console.log(`RUNNING SCRIPT ${scriptFile}`);
    const subprocess = fork(scriptFile, ['--checkParent'], {
      cwd: directory,
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: {
        DBGATE_API: process.argv[1],
      },
    });
    const pipeDispatcher = (severity) => (data) =>
      this.dispatchMessage(runid, { severity, message: data.toString().trim() });

    byline(subprocess.stdout).on('data', pipeDispatcher('info'));
    byline(subprocess.stderr).on('data', pipeDispatcher('error'));
    subprocess.on('exit', (code) => {
      socket.emit(`runner-done-${runid}`, code);
    });
    subprocess.on('error', (error) => {
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
    // @ts-ignore
    subprocess.on('message', ({ msgtype, ...message }) => {
      this[`handle_${msgtype}`](runid, message);
    });
    return newOpened;
  },

  cancel_meta: 'post',
  async cancel({ runid }) {
    const runner = this.opened.find((x) => x.runid == runid);
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
};
