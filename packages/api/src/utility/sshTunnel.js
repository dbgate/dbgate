const portfinder = require('portfinder');
const stableStringify = require('json-stable-stringify');
const _ = require('lodash');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();
const { fork } = require('child_process');
const processArgs = require('../utility/processArgs');
const { getLogger, extractErrorLogData } = require('dbgate-tools');
const pipeForkLogs = require('./pipeForkLogs');
const logger = getLogger('sshTunnel');

const sshTunnelCache = {};
// failed tunnel attempts, used to back off retries - a connection that keeps failing would otherwise
// start a new forward process every few seconds
const sshTunnelErrorCache = {};
const ERROR_BACKOFF_INITIAL_MS = 2000;
const ERROR_BACKOFF_MAX_MS = 60000;

const CONNECTION_FIELDS = [
  'sshHost',
  'sshPort',
  'sshLogin',
  'sshPassword',
  'sshMode',
  'sshKeyfile',
  'sshBastionHost',
  'sshKeyfilePassword',
];
const TUNNEL_FIELDS = [...CONNECTION_FIELDS, 'server', 'port'];

function callForwardProcess(connection, tunnelConfig, tunnelCacheKey, globalSettings) {
  let subprocess = fork(
    global['API_PACKAGE'] || process.argv[1],
    ['--is-forked-api', '--start-process', 'sshForwardProcess', ...processArgs.getPassArgs()],
    {
      env: {
        ...process.env,
        NODE_NO_WARNINGS: globalSettings?.['behaviour.useDiagnosticTools'] === true ? '0' : '1',
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    }
  );
  pipeForkLogs(subprocess);

  try {
    subprocess.send({
      msgtype: 'connect',
      connection,
      tunnelConfig,
    });
  } catch (err) {
    logger.error(extractErrorLogData(err), 'DBGM-00174 Error connecting SSH');
  }
  // a failed (killed) forward process must not remove a newer tunnel for the same key from the cache
  const removeFromCache = () => {
    if (sshTunnelCache[tunnelCacheKey]?.subprocess === subprocess) {
      delete sshTunnelCache[tunnelCacheKey];
    }
  };
  return new Promise((resolve, reject) => {
    let promiseHandled = false;
    subprocess.on('message', resp => {
      // @ts-ignore
      const { msgtype, errorMessage } = resp;
      if (msgtype == 'connected') {
        resolve(subprocess);
        promiseHandled = true;
      }
      if (msgtype == 'error') {
        reject(new Error(errorMessage));
        promiseHandled = true;
        // the forward process stays alive until it is killed, it would leak on every failed attempt
        killForwardProcess(subprocess);
      }
    });
    subprocess.on('exit', code => {
      logger.info(`DBGM-00090 SSH forward process exited with code ${code}`);
      removeFromCache();
      if (!promiseHandled) {
        reject(
          new Error(
            'DBGM-00091 SSH forward process exited, try to change "Local host address for SSH connections" in Settings/Connections'
          )
        );
      }
    });
    subprocess.on('error', error => {
      logger.error(extractErrorLogData(error), 'DBGM-00092 SSH forward process error');
      removeFromCache();
      if (!promiseHandled) {
        reject(error);
        promiseHandled = true;
        killForwardProcess(subprocess);
      }
    });
  });
}

function killForwardProcess(subprocess) {
  try {
    subprocess.kill();
  } catch (err) {
    logger.error(extractErrorLogData(err), 'DBGM-00000 Error killing SSH forward process');
  }
}

async function getSshTunnel(connection) {
  const config = require('../controllers/config');

  const tunnelCacheKey = stableStringify(_.pick(connection, TUNNEL_FIELDS));
  const globalSettings = await config.getSettings();

  return await lock.acquire(tunnelCacheKey, async () => {
    if (sshTunnelCache[tunnelCacheKey]) return sshTunnelCache[tunnelCacheKey];
    const lastError = sshTunnelErrorCache[tunnelCacheKey];
    if (lastError && Date.now() < lastError.retryAt) {
      return {
        state: 'error',
        message: lastError.message,
      };
    }
    const localPort = await portfinder.getPortPromise({ port: 10000, stopPort: 60000 });
    const localHost = globalSettings?.['connection.sshBindHost'] || '127.0.0.1';
    // workaround for `getPortPromise` not releasing the port quickly enough
    await new Promise(resolve => setTimeout(resolve, 500));
    const tunnelConfig = {
      fromPort: localPort,
      fromHost: localHost,
      toPort: connection.port,
      toHost: connection.server,
    };
    try {
      logger.info(
        `DBGM-00093 Creating SSH tunnel to ${connection.sshHost}-${connection.server}:${connection.port}, using local port ${localPort}`
      );

      const subprocess = await callForwardProcess(connection, tunnelConfig, tunnelCacheKey, globalSettings);

      logger.info(
        `DBGM-00094 Created SSH tunnel to ${connection.sshHost}-${connection.server}:${connection.port}, using local port ${localPort}`
      );

      delete sshTunnelErrorCache[tunnelCacheKey];
      sshTunnelCache[tunnelCacheKey] = {
        state: 'ok',
        localPort,
        localHost,
        subprocess,
      };
      return sshTunnelCache[tunnelCacheKey];
    } catch (err) {
      logger.error(extractErrorLogData(err), 'DBGM-00095 Error creating SSH tunnel:');
      // error is cached only for the backoff interval, which doubles with each consecutive failure
      const failures = (lastError?.failures || 0) + 1;
      sshTunnelErrorCache[tunnelCacheKey] = {
        message: err.message,
        failures,
        retryAt: Date.now() + Math.min(ERROR_BACKOFF_INITIAL_MS * 2 ** (failures - 1), ERROR_BACKOFF_MAX_MS),
      };
      return {
        state: 'error',
        message: err.message,
      };
    }
  });
}

module.exports = {
  getSshTunnel,
};
