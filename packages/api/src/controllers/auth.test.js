// Regression tests for the /stream SSE endpoint. It used to be on the unauthenticated skip list,
// so anyone who could reach the port received every broadcast event (application logs, cloud
// tokens, query and script output).

jest.mock('./storage', () => ({}));
jest.mock('../utility/cloudIntf', () => ({}));
jest.mock('../utility/auditlog', () => ({ sendToAuditLog: jest.fn() }));
jest.mock('../utility/loginchecker', () => ({ markUserAsActive: jest.fn() }));
jest.mock('../utility/mcpAuth', () => ({}));
jest.mock('../auth/authProvider', () => ({}));

const jwt = require('jsonwebtoken');
const { getTokenSecret } = require('../auth/authCommon');
const auth = require('./auth');

const alice = { amoid: 'local', login: 'alice', userId: 11 };

function createRes() {
  const res = {
    statusCode: 200,
    status: jest.fn(code => {
      res.statusCode = code;
      return res;
    }),
    send: jest.fn(() => res),
    setHeader: jest.fn(),
  };
  return res;
}

async function runMiddleware(req) {
  const res = createRes();
  const next = jest.fn();
  await auth.authMiddleware({ headers: {}, query: {}, ...req }, res, next);
  return { res, next };
}

function streamToken(claims) {
  return jwt.sign(claims, getTokenSecret(), { expiresIn: '1h' });
}

describe('authMiddleware on /stream', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.SKIP_ALL_AUTH;
    delete process.env.BASIC_AUTH;
  });

  afterAll(() => {
    process.env = savedEnv;
  });

  test('rejects a request without a stream token', async () => {
    const { res, next } = await runMiddleware({ path: '/stream', query: { strmid: 's1' } });
    expect(res.statusCode).toEqual(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts a stream token issued for the same strmid', async () => {
    const token = streamToken({ tokenUse: 'stream', strmid: 's1', user: alice });
    const req = { path: '/stream', headers: {}, query: { strmid: 's1', token } };
    const res = createRes();
    const next = jest.fn();

    await auth.authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(alice);
  });

  test('rejects a stream token issued for another strmid', async () => {
    const token = streamToken({ tokenUse: 'stream', strmid: 's1', user: alice });
    const { res, next } = await runMiddleware({ path: '/stream', query: { strmid: 's2', token } });
    expect(res.statusCode).toEqual(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an ordinary API access token in place of a stream token', async () => {
    const token = streamToken(alice);
    const { res, next } = await runMiddleware({ path: '/stream', query: { strmid: 's1', token } });
    expect(res.statusCode).toEqual(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('a stream token cannot be used as an API session token', async () => {
    const token = streamToken({ tokenUse: 'stream', strmid: 's1', user: alice });
    const { res, next } = await runMiddleware({
      path: '/connections/list',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toEqual(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('stays open without a token when SKIP_ALL_AUTH is set', async () => {
    process.env.SKIP_ALL_AUTH = '1';
    const { next } = await runMiddleware({ path: '/stream', query: { strmid: 's1' } });
    expect(next).toHaveBeenCalled();
  });
});

describe('auth.getStreamToken', () => {
  test('returns nothing without a logged-in user', async () => {
    expect(await auth.getStreamToken({ strmid: 's1' }, {})).toEqual({});
  });

  test('issues a stream-only token bound to the strmid and the user', async () => {
    const { streamToken: token } = await auth.getStreamToken(
      { strmid: 's1' },
      { user: { ...alice, iat: 1, exp: 9999999999 } }
    );
    const decoded = jwt.verify(token, getTokenSecret());
    expect(decoded.tokenUse).toEqual('stream');
    expect(decoded.strmid).toEqual('s1');
    expect(decoded.user).toEqual(alice);
  });

  test('rejects a non-string strmid', async () => {
    expect(await auth.getStreamToken({ strmid: ['s1'] }, { user: alice })).toEqual({});
  });
});

describe('socket stream ownership', () => {
  const socket = require('../utility/socket');

  test('a strmid connected by one user cannot be taken over by another', () => {
    const first = { write: jest.fn() };
    const second = { write: jest.fn() };
    expect(socket.addSseResponse(first, 'owned-strmid', 'alice')).toBe(true);
    expect(socket.isSseResponseOwnedByOther('owned-strmid', 'mallory')).toBe(true);
    expect(socket.addSseResponse(second, 'owned-strmid', 'mallory')).toBe(false);

    socket.emit('some-event', { a: 1 });
    expect(first.write).toHaveBeenCalled();
    expect(second.write).not.toHaveBeenCalled();

    socket.removeSseResponse('owned-strmid', first);
  });

  test('the same user can reconnect, and the old connection closing keeps the new one', () => {
    const first = { write: jest.fn() };
    const second = { write: jest.fn() };
    socket.addSseResponse(first, 'reconnect-strmid', 'alice');
    expect(socket.addSseResponse(second, 'reconnect-strmid', 'alice')).toBe(true);

    socket.removeSseResponse('reconnect-strmid', first);
    socket.emit('some-event', { a: 1 });
    expect(second.write).toHaveBeenCalled();

    socket.removeSseResponse('reconnect-strmid', second);
  });
});
