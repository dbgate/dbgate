// Regression tests for the runners routes.
//
// * runners/files used runid as a directory name under rundir(), so '../..' listed any directory.
// * JSON scripts (runners/start, script-result, load-reader) could call any shell API function on
//   any connection - see utility/jsonScriptAccess.test.js; here only that the routes apply it.

jest.mock('./config', () => ({ getSettings: jest.fn(async () => ({})) }));
jest.mock('../utility/auditlog', () => ({ sendToAuditLog: jest.fn(), logJsonRunnerScript: jest.fn() }));
jest.mock('../utility/hasPermission', () => ({ testStandardPermission: jest.fn() }));
jest.mock('../utility/jsonScriptAccess', () => ({
  checkJsonScriptAccess: jest.fn(async () => {
    throw new Error('DBGM-00000 Function executeQuery is not allowed in scripts');
  }),
  checkShellFunctionCall: jest.fn(async () => {
    throw new Error('DBGM-00000 Function executeQuery is not allowed in scripts');
  }),
}));

const runners = require('./runners');

const req = { user: { login: 'alice' }, headers: {} };

test('runners/files refuses a runid that is not an id', async () => {
  await expect(runners.files({ runid: '../..' })).rejects.toThrow('Invalid runid');
  await expect(runners.files({ runid: '/etc' })).rejects.toThrow('Invalid runid');
});

test('JSON scripts are checked before they run', async () => {
  const script = {
    type: 'json',
    commands: [{ type: 'assign', functionName: 'executeQuery', props: {} }],
    packageNames: [],
  };
  jest.spyOn(runners, 'startCore');
  await expect(runners.start({ script }, req)).rejects.toThrow('not allowed');
  await expect(runners.scriptResult({ script }, req)).rejects.toThrow('not allowed');
  await expect(runners.loadReader({ functionName: 'executeQuery', props: {} }, req)).rejects.toThrow('not allowed');
  expect(runners.startCore).not.toHaveBeenCalled();
});
