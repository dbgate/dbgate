const mockPost = jest.fn();
const mockSocketEmit = jest.fn();
const mockClearCredentials = jest.fn();
const mockReadCredentials = jest.fn();
const mockWriteCredentials = jest.fn();
let mockServer;

jest.mock('axios', () => ({ default: { post: mockPost } }));
jest.mock('http', () => {
  const { EventEmitter } = jest.requireActual('events');
  return {
    createServer: jest.fn(() => {
      const server = new EventEmitter();
      server.listening = false;
      server.listen = jest.fn(() => {
        server.listening = true;
        queueMicrotask(() => server.emit('listening'));
      });
      server.close = jest.fn(() => {
        server.listening = false;
      });
      mockServer = server;
      return server;
    }),
  };
});
jest.mock('../utility/processArgs', () => ({ runE2eTests: true }));
jest.mock('../utility/platformInfo', () => ({ isElectron: false }));
jest.mock('../utility/socket', () => ({ emit: mockSocketEmit }));
jest.mock('./credentials', () => ({
  clearCredentials: mockClearCredentials,
  readCredentials: mockReadCredentials,
  writeCredentials: mockWriteCredentials,
}));

const processArgs = require('../utility/processArgs');
const platformInfo = require('../utility/platformInfo');
const oauth = require('./oauth');

function jwtWithClaims(claims) {
  return `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function requestCallback(path) {
  return new Promise(resolve => {
    const response = {
      headersSent: false,
      statusCode: null,
      writeHead(statusCode) {
        this.headersSent = true;
        this.statusCode = statusCode;
      },
      end() {
        resolve(this.statusCode);
      },
    };
    mockServer.emit('request', { url: path }, response);
  });
}

function tick() {
  return new Promise(resolve => setImmediate(resolve));
}

describe('Codex OAuth', () => {
  const previousE2eToken = process.env.DBGATE_CODEX_E2E_ACCESS_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    processArgs.runE2eTests = true;
    platformInfo.isElectron = false;
    delete process.env.DBGATE_CODEX_E2E_ACCESS_TOKEN;
    mockClearCredentials.mockResolvedValue(undefined);
    mockReadCredentials.mockResolvedValue(null);
    mockWriteCredentials.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (previousE2eToken == null) delete process.env.DBGATE_CODEX_E2E_ACCESS_TOKEN;
    else process.env.DBGATE_CODEX_E2E_ACCESS_TOKEN = previousE2eToken;
  });

  test('uses the registered localhost redirect while binding the IPv4 loopback', () => {
    expect(oauth.CALLBACK_HOST).toBe('127.0.0.1');
    expect(oauth.CALLBACK_URL).toBe('http://localhost:1455/auth/callback');
  });

  test('is enabled by default for Electron and E2E only', () => {
    processArgs.runE2eTests = false;
    platformInfo.isElectron = true;
    expect(oauth.isEnabled()).toBe(true);

    platformInfo.isElectron = false;
    expect(oauth.isEnabled()).toBe(false);

    processArgs.runE2eTests = true;
    expect(oauth.isEnabled()).toBe(true);
  });

  test('extracts the account ID without exposing other claims', () => {
    const accessToken = jwtWithClaims({
      email: 'private@example.com',
      'https://api.openai.com/auth': { chatgpt_account_id: 'account-123' },
    });
    expect(oauth.extractAccountId({ access_token: accessToken })).toBe('account-123');
  });

  test.each([
    ['a missing token object', null],
    ['a non-string token', { access_token: 42 }],
    ['a token without three segments', { access_token: 'not-a-jwt' }],
    ['a token with malformed JSON claims', { access_token: 'header.bm90LWpzb24.signature' }],
  ])('ignores account claims from %s', (_label, tokens) => {
    expect(oauth.extractAccountId(tokens)).toBeNull();
  });

  test('keeps a login pending when a callback does not contain its state', async () => {
    await oauth.startLogin({ strmid: 'stream-state' });

    await expect(requestCallback('/auth/callback?error=access_denied')).resolves.toBe(400);
    await expect(oauth.getStatus()).resolves.toMatchObject({ connected: false, loginPending: true });

    await oauth.cancelLogin({ strmid: 'stream-state' });
    await expect(oauth.getStatus()).resolves.toMatchObject({ connected: false, loginPending: false });
    expect(mockPost).not.toHaveBeenCalled();
  });

  test('turns corrupt stored credentials into a recoverable disconnected status', async () => {
    mockReadCredentials.mockRejectedValueOnce(new Error('corrupt-secret-detail'));

    await expect(oauth.getStatus()).resolves.toEqual({
      enabled: true,
      connected: false,
      loginPending: false,
    });
    expect(mockClearCredentials).toHaveBeenCalledTimes(1);
  });

  test('does not persist a refresh that completes after disconnect', async () => {
    const expired = {
      accessToken: 'old-access-secret',
      refreshToken: 'old-refresh-secret',
      expiresAt: Date.now() - 1,
    };
    const tokenRequestStarted = deferred();
    const tokenResponse = deferred();
    mockReadCredentials.mockResolvedValueOnce(expired).mockResolvedValue(null);
    mockPost.mockImplementationOnce(() => {
      tokenRequestStarted.resolve();
      return tokenResponse.promise;
    });

    const refresh = oauth.getAccessCredentials();
    await tokenRequestStarted.promise;
    await oauth.disconnect({ strmid: 'stream-race' });
    tokenResponse.resolve({
      status: 200,
      data: { access_token: 'late-access', refresh_token: 'late-refresh', expires_in: 3600 },
    });

    await expect(refresh).rejects.toThrow('DBGM-00000 Codex authentication changed; retry the request');
    expect(mockWriteCredentials).not.toHaveBeenCalled();
    expect(mockClearCredentials).toHaveBeenCalledTimes(1);
  });

  test('does not let a stale invalidation clear freshly refreshed credentials', async () => {
    const current = {
      accessToken: 'old-access-secret',
      refreshToken: 'old-refresh-secret',
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    mockReadCredentials.mockResolvedValue(current);
    mockPost.mockResolvedValue({
      status: 200,
      data: { access_token: 'new-access-secret', refresh_token: 'new-refresh-secret', expires_in: 3600 },
    });

    const beforeRefresh = await oauth.getAccessCredentials();
    const afterRefresh = await oauth.getAccessCredentials({ forceRefresh: true });
    const invalidated = await oauth.invalidateCredentials({ expectedRevision: beforeRefresh.authRevision });

    expect(afterRefresh.authRevision).toBeGreaterThan(beforeRefresh.authRevision);
    expect(invalidated).toBe(false);
    expect(mockClearCredentials).not.toHaveBeenCalled();
  });

  test.each([
    ['a missing refresh token', undefined],
    ['an empty refresh token', ''],
    ['a malformed refresh token', { private: 'provider-secret-detail' }],
  ])('keeps the previous refresh token for %s', async (_label, refreshToken) => {
    const expired = {
      accessToken: 'old-access-secret',
      refreshToken: 'old-refresh-secret',
      expiresAt: Date.now() - 1,
      accountId: 'old-account',
    };
    const beforeRefresh = Date.now();
    mockReadCredentials.mockResolvedValue(expired);
    mockPost.mockResolvedValue({
      status: 200,
      data: {
        access_token: 'new-access-secret',
        refresh_token: refreshToken,
        expires_in: '120',
        id_token: { private: 'provider-secret-detail' },
      },
    });

    const refreshed = await oauth.getAccessCredentials();

    expect(refreshed).toMatchObject({
      accessToken: 'new-access-secret',
      refreshToken: 'old-refresh-secret',
      accountId: 'old-account',
    });
    expect(refreshed.expiresAt).toBeGreaterThanOrEqual(beforeRefresh + 120_000);
    expect(refreshed.expiresAt).toBeLessThanOrEqual(Date.now() + 120_000);
    expect(mockWriteCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: 'old-refresh-secret', accountId: 'old-account' })
    );
    expect(JSON.stringify(mockWriteCredentials.mock.calls)).not.toContain('provider-secret-detail');
  });

  test.each([undefined, 0, -1, 'not-a-number'])('defaults malformed expiry %# to one hour', async expiresIn => {
    const expired = {
      accessToken: 'old-access-secret',
      refreshToken: 'old-refresh-secret',
      expiresAt: Date.now() - 1,
    };
    const beforeRefresh = Date.now();
    mockReadCredentials.mockResolvedValue(expired);
    mockPost.mockResolvedValue({
      status: 200,
      data: {
        access_token: 'new-access-secret',
        refresh_token: 'new-refresh-secret',
        expires_in: expiresIn,
      },
    });

    const refreshed = await oauth.getAccessCredentials();

    expect(refreshed.expiresAt).toBeGreaterThanOrEqual(beforeRefresh + 3_600_000);
    expect(refreshed.expiresAt).toBeLessThanOrEqual(Date.now() + 3_600_000);
  });

  test('rejects malformed authentication action parameters without exposing validation details', async () => {
    await expect(oauth.startLogin({ strmid: 42 })).rejects.toThrow('DBGM-00000 Invalid Codex authentication request');
    expect(mockClearCredentials).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  test('serializes disconnect after an OAuth credential write', async () => {
    const writeStarted = deferred();
    const releaseWrite = deferred();
    let storedCredentials = null;
    mockReadCredentials.mockImplementation(async () => storedCredentials);
    mockWriteCredentials.mockImplementationOnce(async credentials => {
      writeStarted.resolve();
      await releaseWrite.promise;
      storedCredentials = credentials;
    });
    mockClearCredentials.mockImplementation(async () => {
      storedCredentials = null;
    });
    mockPost.mockResolvedValue({
      status: 200,
      data: { access_token: 'oauth-access', refresh_token: 'oauth-refresh', expires_in: 3600 },
    });

    const { authorizationUrl } = await oauth.startLogin({ strmid: 'stream-write-race' });
    const state = new URL(authorizationUrl).searchParams.get('state');
    const callback = requestCallback(`/auth/callback?code=test-code&state=${encodeURIComponent(state)}`);
    await writeStarted.promise;

    const disconnect = oauth.disconnect({ strmid: 'stream-write-race' });
    releaseWrite.resolve();

    await expect(callback).resolves.toBe(200);
    await expect(disconnect).resolves.toMatchObject({ connected: false, loginPending: false });
    expect(storedCredentials).toBeNull();
    expect(mockWriteCredentials.mock.invocationCallOrder[0]).toBeLessThan(
      mockClearCredentials.mock.invocationCallOrder[0]
    );
  });

  test('clears credentials and emits a sanitized disconnected status when refresh fails', async () => {
    const expired = {
      accessToken: 'old-access-secret',
      refreshToken: 'old-refresh-secret',
      expiresAt: Date.now() - 1,
    };
    mockReadCredentials.mockResolvedValueOnce(expired).mockResolvedValueOnce(null);
    mockPost.mockResolvedValue({ status: 400, data: { error: 'upstream-secret-detail' } });

    await expect(oauth.getAccessCredentials()).rejects.toThrow(
      'DBGM-00000 Codex authentication expired; connect ChatGPT again'
    );

    expect(mockClearCredentials).toHaveBeenCalledTimes(1);
    expect(mockSocketEmit).toHaveBeenCalledWith('codex-auth-status', {
      strmid: null,
      enabled: true,
      connected: false,
      loginPending: false,
      errorMessage: 'DBGM-00000 Codex authentication expired; connect ChatGPT again',
    });
    expect(JSON.stringify(mockSocketEmit.mock.calls)).not.toContain('old-refresh-secret');
    expect(JSON.stringify(mockSocketEmit.mock.calls)).not.toContain('upstream-secret-detail');
  });

  test.each([
    ['missing data', null],
    ['missing access token', { refresh_token: 'new-refresh-secret' }],
    ['an empty access token', { access_token: '', refresh_token: 'new-refresh-secret' }],
    ['a non-string access token', { access_token: { secret: 'upstream-secret-detail' } }],
  ])('rejects a successful refresh containing %s without clearing stored credentials', async (_label, data) => {
    const expired = {
      accessToken: 'old-access-secret',
      refreshToken: 'old-refresh-secret',
      expiresAt: Date.now() - 1,
    };
    mockReadCredentials.mockResolvedValueOnce(expired).mockResolvedValue(null);
    mockPost.mockResolvedValue({ status: 200, data });

    await expect(oauth.getAccessCredentials()).rejects.toThrow(
      'DBGM-00000 Codex authentication did not return an access token'
    );

    expect(mockWriteCredentials).not.toHaveBeenCalled();
    expect(mockClearCredentials).not.toHaveBeenCalled();
    expect(JSON.stringify(mockSocketEmit.mock.calls)).not.toContain('old-refresh-secret');
    expect(JSON.stringify(mockSocketEmit.mock.calls)).not.toContain('upstream-secret-detail');
  });

  test.each([
    ['a network failure', null, 'DBGM-00000 Could not reach the Codex authentication service'],
    ['an HTTP 500 response', 500, 'DBGM-00000 Codex authentication failed with HTTP 500'],
    ['an HTTP 429 response', 429, 'DBGM-00000 Codex authentication failed with HTTP 429'],
  ])('keeps stored credentials when refresh fails with %s', async (_label, status, message) => {
    const expired = {
      accessToken: 'old-access-secret',
      refreshToken: 'old-refresh-secret',
      expiresAt: Date.now() - 1,
    };
    mockReadCredentials.mockResolvedValueOnce(expired).mockResolvedValue(null);
    if (status) {
      mockPost.mockResolvedValue({ status, data: { error: 'upstream-secret-detail' } });
    } else {
      mockPost.mockRejectedValue(new Error('socket hang up'));
    }

    await expect(oauth.getAccessCredentials()).rejects.toThrow(message);

    expect(mockWriteCredentials).not.toHaveBeenCalled();
    expect(mockClearCredentials).not.toHaveBeenCalled();
  });

  test('rejects malformed authorization tokens without leaking the provider response', async () => {
    mockPost.mockResolvedValue({
      status: 200,
      data: {
        access_token: { private: 'provider-secret-detail' },
        refresh_token: 'refresh-secret',
      },
    });

    const { authorizationUrl } = await oauth.startLogin({ strmid: 'stream-malformed-token' });
    const state = new URL(authorizationUrl).searchParams.get('state');

    await expect(requestCallback(`/auth/callback?code=test-code&state=${encodeURIComponent(state)}`)).resolves.toBe(
      400
    );
    await tick();

    expect(mockWriteCredentials).not.toHaveBeenCalled();
    expect(mockSocketEmit).toHaveBeenCalledWith('codex-auth-status', {
      strmid: 'stream-malformed-token',
      enabled: true,
      connected: false,
      loginPending: false,
      errorMessage: 'DBGM-00000 Codex authentication did not return an access token',
    });
    expect(JSON.stringify(mockSocketEmit.mock.calls)).not.toContain('provider-secret-detail');
  });

  test('uses the E2E access token only until disconnect', async () => {
    process.env.DBGATE_CODEX_E2E_ACCESS_TOKEN = 'e2e-secret';

    await expect(oauth.getStatus()).resolves.toEqual({ enabled: true, connected: true, loginPending: false });
    await expect(oauth.getAccessCredentials()).resolves.toMatchObject({ accessToken: 'e2e-secret' });
    await expect(oauth.disconnect({ strmid: 'stream-1' })).resolves.toEqual({
      enabled: true,
      connected: false,
      loginPending: false,
    });
    await expect(oauth.getAccessCredentials()).rejects.toThrow(
      'DBGM-00000 Connect ChatGPT in AI settings before using Codex'
    );
    expect(mockReadCredentials).not.toHaveBeenCalled();
  });
});
