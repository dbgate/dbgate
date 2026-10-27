// Tests for the route access declarations enforced by useController (routeAccess.js).
//
// Permission checks used to be written by hand in each controller method, and many routes had
// none (e.g. dbgate/dbgate#1601). Every route now declares its access, and a route without a
// declaration is refused, so a new route cannot be exposed by mistake.

const http = require('http');
const express = require('express');

// permissions of the request come from the x-test-permissions header
jest.mock('../auth/authProvider', () => ({
  getAuthProviderFromReq: jest.fn(() => ({
    getCurrentPermissions: async req => req.headers['x-test-permissions'],
    checkCurrentConnectionPermission: async () => true,
  })),
}));

const useController = require('./useController');
const { validateRouteAccess } = require('./routeAccess');

const calls = [];
const controller = {
  undeclared_meta: true,
  async undeclared() {
    calls.push('undeclared');
    return 'ran';
  },

  invalid_meta: true,
  invalid_access: { permission: '' },
  async invalid() {
    calls.push('invalid');
    return 'ran';
  },

  anyUser_meta: true,
  anyUser_access: 'user',
  async anyUser() {
    return 'ran';
  },

  desktopOnly_meta: true,
  desktopOnly_access: 'electron',
  async desktopOnly() {
    calls.push('desktopOnly');
    return 'ran';
  },

  settings_meta: true,
  settings_access: { permission: 'admin/settings' },
  async settings() {
    return 'ran';
  },

  query_meta: true,
  query_access: { permission: 'dbops/query', connection: 'conid' },
  async query({ conid }) {
    return `ran ${conid}`;
  },

  rawDownload_meta: { raw: true, method: 'get' },
  rawDownload_access: { connection: 'conid' },
  rawDownload(req, res) {
    res.json('raw ran');
  },
};

let server;
let baseUrl;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  useController(app, null, '/test', controller);
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

beforeEach(() => {
  calls.length = 0;
});

async function post(path, body, permissions) {
  const resp = await fetch(`${baseUrl}/test/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(permissions ? { 'x-test-permissions': permissions } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  return { status: resp.status, body: await resp.json() };
}

describe('routes without a valid access declaration', () => {
  test('an invalid declaration is refused and the method does not run', async () => {
    expect(await post('invalid')).toEqual({
      status: 403,
      body: { apiErrorMessage: 'DBGM-00000 Route has no access policy' },
    });
    expect(calls).toEqual([]);
  });

  test('a missing declaration is refused and the method does not run', async () => {
    expect((await post('undeclared')).status).toBe(403);
    expect(calls).toEqual([]);
  });
});

describe('declared routes', () => {
  test('user routes run for anyone logged in', async () => {
    expect(await post('any-user', {}, '~*')).toEqual({ status: 200, body: 'ran' });
  });

  test('desktop-only routes are refused in the web app', async () => {
    expect((await post('desktop-only')).status).toBe(403);
    expect(calls).toEqual([]);
  });

  test('a required permission is checked', async () => {
    expect((await post('settings', {}, '~admin/*')).status).toBe(403);
    expect(await post('settings', {}, '*')).toEqual({ status: 200, body: 'ran' });
    // no permissions configured = allow all, as before
    expect(await post('settings')).toEqual({ status: 200, body: 'ran' });
  });

  test('a connection permission is checked against the argument', async () => {
    const restricted = '~connections/*,connections/allowed';
    expect(await post('query', { conid: 'allowed' }, restricted)).toEqual({ status: 200, body: 'ran allowed' });
    expect((await post('query', { conid: 'other' }, restricted)).status).toBe(403);
    expect((await post('query', { conid: 'allowed' }, `${restricted},~dbops/query`)).status).toBe(403);
  });

  test('a missing connection argument is refused', async () => {
    expect((await post('query', {})).status).toBe(403);
  });

  test('raw routes are checked too', async () => {
    const restricted = '~connections/*,connections/allowed';
    const get = async conid => {
      const resp = await fetch(`${baseUrl}/test/raw-download?conid=${conid}`, {
        headers: { 'x-test-permissions': restricted },
      });
      return resp.status;
    };
    expect(await get('allowed')).toBe(200);
    expect(await get('other')).toBe(403);
  });
});

describe('desktop app', () => {
  test('registers every route as an IPC handler without checks', async () => {
    const handlers = {};
    useController(null, { ipcMain: { handle: (name, fn) => (handlers[name] = fn) } }, '/test', controller);
    expect(await handlers['test-undeclared'](null, {})).toBe('ran');
    expect(await handlers['test-desktop-only'](null, {})).toBe('ran');
  });
});

describe('validateRouteAccess', () => {
  test('accepts the documented forms only', () => {
    for (const valid of [
      'public',
      'user',
      'self',
      'electron',
      { permission: 'admin/settings' },
      { permission: ['dbops/query', 'dbops/export'] },
      { connection: 'conid' },
      { connection: 'conid', database: 'database', databaseRole: 'read_content' },
    ]) {
      expect(validateRouteAccess(valid)).toBe(true);
    }
    for (const invalid of [
      undefined,
      true,
      'admin',
      {},
      { permission: '' },
      { permission: [] },
      { connection: 'conid', databaseRole: 'read_content' },
      { connection: 'conid', database: 'database' },
      { connection: 'conid', database: 'database', databaseRole: 'owner' },
      { permissions: 'typo' },
    ]) {
      expect(validateRouteAccess(invalid)).toBe(false);
    }
  });
});
