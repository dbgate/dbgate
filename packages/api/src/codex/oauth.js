const { z } = require('zod');

const processArgs = require('../utility/processArgs');
const platformInfo = require('../utility/platformInfo');
const socket = require('../utility/socket');
const { clearCredentials, readCredentials, writeCredentials } = require('./credentials');
const { createLoginManager } = require('./oauthLogin');
const {
  CALLBACK_HOST,
  CALLBACK_PORT,
  CALLBACK_URL,
  extractAccountId,
  refreshAccessCredentials,
} = require('./oauthProtocol');

const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const authActionParamsSchema = z.object({
  strmid: z.string().nullable().optional().default(null),
});

let refreshState = null;
let e2eDisconnected = false;
let authRevision = 0;
let authMutationTail = Promise.resolve();

function withAuthMutation(callback) {
  const operation = authMutationTail.then(callback, callback);
  authMutationTail = operation.catch(() => {});
  return operation;
}

function createStaleAuthError() {
  const error = new Error('DBGM-00000 Codex authentication changed; retry the request');
  error.codexAuthStale = true;
  return error;
}

function isInvalidRefreshCredentialsError(error) {
  return error?.codexHttpStatus === 400 || error?.codexHttpStatus === 401 || error?.codexHttpStatus === 403;
}

function isEnabled() {
  return platformInfo.isElectron || processArgs.runE2eTests;
}

function getE2eAccessToken() {
  if (!processArgs.runE2eTests || !process.env.DBGATE_CODEX_E2E_ACCESS_TOKEN) return null;
  return process.env.DBGATE_CODEX_E2E_ACCESS_TOKEN;
}

function parseAuthActionParams(params) {
  const result = authActionParamsSchema.safeParse(params ?? {});
  if (!result.success) {
    throw new Error('DBGM-00000 Invalid Codex authentication request');
  }
  return result.data;
}

function sameCredentials(left, right) {
  return left?.accessToken === right?.accessToken && left?.refreshToken === right?.refreshToken;
}

async function refreshCredentials(previous, expectedRevision) {
  const refreshed = await refreshAccessCredentials(previous);
  return withAuthMutation(async () => {
    if (authRevision !== expectedRevision) throw createStaleAuthError();

    const stored = await readCredentials();
    if (!sameCredentials(stored, previous)) throw createStaleAuthError();

    await writeCredentials(refreshed);
    authRevision += 1;
    return { ...refreshed, authRevision };
  });
}

async function invalidateCredentials({ strmid = null, errorMessage = null, expectedRevision = null } = {}) {
  const invalidated = await withAuthMutation(async () => {
    if (expectedRevision != null && expectedRevision !== authRevision) return false;

    if (getE2eAccessToken()) {
      e2eDisconnected = true;
    } else {
      await clearCredentials();
    }
    authRevision += 1;
    return true;
  });

  if (invalidated) await publishStatus(strmid, errorMessage);
  return invalidated;
}

async function readCredentialsSnapshot() {
  return withAuthMutation(async () => {
    try {
      return { credentials: await readCredentials(), authRevision };
    } catch (error) {
      try {
        await clearCredentials();
      } catch {}
      authRevision += 1;
      return {
        credentials: null,
        authRevision,
      };
    }
  });
}

async function getAccessCredentials({ forceRefresh = false } = {}) {
  const e2eAccessToken = getE2eAccessToken();
  if (e2eAccessToken) {
    if (e2eDisconnected) {
      throw new Error('DBGM-00000 Connect ChatGPT in AI settings before using Codex');
    }
    return {
      accessToken: e2eAccessToken,
      refreshToken: 'e2e',
      expiresAt: Number.MAX_SAFE_INTEGER,
      authRevision,
    };
  }

  const snapshot = await readCredentialsSnapshot();
  const current = snapshot.credentials;
  if (!current) {
    throw new Error('DBGM-00000 Connect ChatGPT in AI settings before using Codex');
  }

  if (!forceRefresh && current.expiresAt > Date.now() + REFRESH_MARGIN_MS) {
    return { ...current, authRevision: snapshot.authRevision };
  }

  if (!refreshState || refreshState.authRevision !== snapshot.authRevision) {
    const nextRefreshState = { authRevision: snapshot.authRevision, promise: null };
    nextRefreshState.promise = refreshCredentials(current, snapshot.authRevision)
      .catch(async error => {
        if (error?.codexAuthStale) throw error;
        if (!isInvalidRefreshCredentialsError(error)) throw error;
        const errorMessage = 'DBGM-00000 Codex authentication expired; connect ChatGPT again';
        const invalidated = await invalidateCredentials({
          errorMessage,
          expectedRevision: snapshot.authRevision,
        });
        if (!invalidated) throw createStaleAuthError();
        throw new Error(errorMessage);
      })
      .finally(() => {
        if (refreshState === nextRefreshState) refreshState = null;
      });
    refreshState = nextRefreshState;
  }
  return refreshState.promise;
}

async function getStatus() {
  if (!isEnabled()) {
    return { enabled: false, connected: false, loginPending: false };
  }
  const e2eAccessToken = getE2eAccessToken();
  const snapshot = e2eAccessToken
    ? {
        credentials: e2eDisconnected ? null : { accessToken: e2eAccessToken, refreshToken: 'e2e' },
      }
    : await readCredentialsSnapshot();
  return {
    enabled: true,
    connected: !!snapshot.credentials?.accessToken && !!snapshot.credentials?.refreshToken,
    loginPending: loginManager.isPending(),
  };
}

async function publishStatus(strmid, errorMessage) {
  const status = await getStatus();
  socket.emit('codex-auth-status', {
    strmid,
    ...status,
    ...(errorMessage ? { errorMessage } : {}),
  });
  return status;
}

async function commitLoginCredentials(credentials) {
  await writeCredentials(credentials);
  authRevision += 1;
}

const loginManager = createLoginManager({
  commitCredentials: commitLoginCredentials,
  publishStatus,
  withAuthMutation,
});

async function startLogin(params) {
  const { strmid } = parseAuthActionParams(params);
  return loginManager.startLogin(strmid);
}

async function cancelLogin(params) {
  const { strmid } = parseAuthActionParams(params);
  return loginManager.cancelLogin(strmid);
}

async function disconnect(params) {
  const { strmid } = parseAuthActionParams(params);
  await withAuthMutation(async () => {
    loginManager.closePendingLogin();
    if (getE2eAccessToken()) {
      e2eDisconnected = true;
    } else {
      await clearCredentials();
    }
    authRevision += 1;
  });
  await publishStatus(strmid);
  return getStatus();
}

module.exports = {
  CALLBACK_HOST,
  CALLBACK_PORT,
  CALLBACK_URL,
  cancelLogin,
  disconnect,
  extractAccountId,
  getAccessCredentials,
  getStatus,
  invalidateCredentials,
  isEnabled,
  startLogin,
};
