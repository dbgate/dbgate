// Regression tests for https://github.com/dbgate/dbgate/issues/1605 - a failed SSH tunnel attempt left its
// sshForwardProcess child running, and the retries kept starting new ones until the host ran out of memory.

const mockForked = [];

jest.mock('child_process', () => ({
  fork: jest.fn(() => {
    const { EventEmitter } = require('events');
    const subprocess = new EventEmitter();
    subprocess.kill = jest.fn(() => {
      subprocess.killed = true;
      setImmediate(() => subprocess.emit('exit', null));
    });
    subprocess.send = jest.fn(msg => {
      if (msg.msgtype == 'connect') {
        setImmediate(() => subprocess.emit('message', mockForked.response(msg)));
      }
    });
    mockForked.push(subprocess);
    return subprocess;
  }),
}));
jest.mock('portfinder', () => ({ getPortPromise: jest.fn(async () => 10000) }));
jest.mock('./pipeForkLogs', () => jest.fn());
jest.mock('dbgate-tools', () => ({
  getLogger: () => ({ info: jest.fn(), error: jest.fn() }),
  extractErrorLogData: err => ({ err }),
}));
jest.mock('../controllers/config', () => ({ getSettings: jest.fn(async () => ({})) }));

const connection = { sshHost: '127.0.0.1', sshPort: 1, server: 'db', port: 5432 };

function loadSshTunnel() {
  let module;
  jest.isolateModules(() => {
    module = require('./sshTunnel');
  });
  return module;
}

beforeEach(() => {
  mockForked.length = 0;
  mockForked.response = () => ({ msgtype: 'error', errorMessage: 'connect ECONNREFUSED 127.0.0.1:1' });
  jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
});

afterEach(() => {
  jest.useRealTimers();
});

async function callGetSshTunnel(getSshTunnel) {
  const promise = getSshTunnel(connection);
  // the 500 ms wait for the port to be released
  await jest.advanceTimersByTimeAsync(500);
  return promise;
}

test('a failed tunnel attempt kills its forward process', async () => {
  const { getSshTunnel } = loadSshTunnel();
  const res = await callGetSshTunnel(getSshTunnel);
  expect(res).toEqual({ state: 'error', message: 'connect ECONNREFUSED 127.0.0.1:1' });
  expect(mockForked).toHaveLength(1);
  expect(mockForked[0].kill).toHaveBeenCalled();
});

test('retries after a failure back off instead of starting a new process each time', async () => {
  const { getSshTunnel } = loadSshTunnel();
  await callGetSshTunnel(getSshTunnel);
  expect(mockForked).toHaveLength(1);

  // within the backoff interval, the cached error is returned
  const res = await getSshTunnel(connection);
  expect(res.state).toBe('error');
  expect(mockForked).toHaveLength(1);

  // after the backoff interval, a new attempt is made
  await jest.advanceTimersByTimeAsync(2000);
  await callGetSshTunnel(getSshTunnel);
  expect(mockForked).toHaveLength(2);

  // the interval doubles after a second failure
  await jest.advanceTimersByTimeAsync(2000);
  await getSshTunnel(connection);
  expect(mockForked).toHaveLength(2);
  await jest.advanceTimersByTimeAsync(2000);
  await callGetSshTunnel(getSshTunnel);
  expect(mockForked).toHaveLength(3);
  expect(mockForked.every(p => p.kill.mock.calls.length > 0)).toBe(true);
});

test('a successful tunnel is cached and not removed by the exit of an earlier failed process', async () => {
  const { getSshTunnel } = loadSshTunnel();
  await callGetSshTunnel(getSshTunnel);

  mockForked.response = () => ({ msgtype: 'connected' });
  await jest.advanceTimersByTimeAsync(2000);
  const tunnel = await callGetSshTunnel(getSshTunnel);
  expect(tunnel).toMatchObject({ state: 'ok', localPort: 10000 });

  // a late exit of the failed process
  mockForked[0].emit('exit', null);
  expect(await getSshTunnel(connection)).toBe(tunnel);
  expect(mockForked).toHaveLength(2);
  expect(mockForked[1].kill).not.toHaveBeenCalled();
});
