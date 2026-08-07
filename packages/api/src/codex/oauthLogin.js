const http = require('http');

const {
  CALLBACK_HOST,
  CALLBACK_PATH,
  CALLBACK_PORT,
  CALLBACK_URL,
  createAuthorizationRequest,
  exchangeAuthorizationCode,
} = require('./oauthProtocol');

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const SUCCESS_PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>DbGate Codex</title></head><body><h1>Connected to ChatGPT</h1><p>You can close this window and return to DbGate.</p></body></html>`;
const ERROR_PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>DbGate Codex</title></head><body><h1>Could not connect to ChatGPT</h1><p>DBGM-00000 Return to DbGate and try again.</p></body></html>`;

function createLoginManager({ commitCredentials, publishStatus, withAuthMutation }) {
  let pendingLogin = null;

  function writeCallbackPage(response, status, body) {
    response.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(body);
  }

  function closeAttempt(attempt) {
    if (attempt.settled) return false;
    attempt.settled = true;
    clearTimeout(attempt.timeout);
    attempt.abortController.abort();
    if (attempt.server.listening) attempt.server.close();
    if (pendingLogin === attempt) pendingLogin = null;
    return true;
  }

  async function finishAttempt(attempt, errorMessage) {
    const closed = await withAuthMutation(() => closeAttempt(attempt));
    if (!closed) return;
    await publishStatus(attempt.strmid, errorMessage);
  }

  async function handleCallback(attempt, request, response) {
    if (pendingLogin !== attempt || attempt.settled) {
      writeCallbackPage(response, 409, ERROR_PAGE);
      return;
    }

    const url = new URL(request.url || '/', CALLBACK_URL);
    if (url.pathname !== CALLBACK_PATH) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('DBGM-00000 Not found');
      return;
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const providerError = url.searchParams.get('error');

    if (state !== attempt.state) {
      writeCallbackPage(response, 400, ERROR_PAGE);
      return;
    }

    if (attempt.processing) {
      writeCallbackPage(response, 409, ERROR_PAGE);
      return;
    }
    attempt.processing = true;

    if (providerError || !code) {
      writeCallbackPage(response, 400, ERROR_PAGE);
      await finishAttempt(attempt, 'DBGM-00000 ChatGPT authorization was not completed');
      return;
    }

    try {
      const credentials = await exchangeAuthorizationCode(code, attempt.verifier, attempt.abortController.signal);
      const committed = await withAuthMutation(async () => {
        if (pendingLogin !== attempt || attempt.settled) return false;
        await commitCredentials(credentials);
        closeAttempt(attempt);
        return true;
      });
      if (!committed) {
        if (!response.headersSent) writeCallbackPage(response, 409, ERROR_PAGE);
        return;
      }
      writeCallbackPage(response, 200, SUCCESS_PAGE);
      await publishStatus(attempt.strmid);
    } catch (error) {
      if (!response.headersSent) writeCallbackPage(response, 400, ERROR_PAGE);
      await finishAttempt(
        attempt,
        error?.message?.startsWith('DBGM-00000') ? error.message : 'DBGM-00000 Could not complete ChatGPT authorization'
      );
    }
  }

  async function startLogin(strmid) {
    const { authorizationUrl, state, verifier } = createAuthorizationRequest();
    const server = http.createServer();
    const attempt = {
      abortController: new AbortController(),
      processing: false,
      server,
      settled: false,
      state,
      strmid,
      timeout: null,
      verifier,
    };
    server.on('request', (request, response) => {
      void handleCallback(attempt, request, response);
    });
    await withAuthMutation(() => {
      if (pendingLogin) {
        throw new Error('DBGM-00000 A Codex login is already in progress');
      }
      pendingLogin = attempt;
    });

    try {
      await new Promise((resolve, reject) => {
        const onError = error => {
          server.off('listening', onListening);
          reject(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(CALLBACK_PORT, CALLBACK_HOST);
      });
    } catch (error) {
      await finishAttempt(attempt);
      throw new Error('DBGM-00000 Could not start the local Codex login callback');
    }

    const activated = await withAuthMutation(() => {
      if (pendingLogin !== attempt || attempt.settled) return false;
      attempt.timeout = setTimeout(() => {
        void finishAttempt(attempt, 'DBGM-00000 ChatGPT authorization timed out');
      }, LOGIN_TIMEOUT_MS);
      attempt.timeout.unref?.();
      return true;
    });
    if (!activated) {
      throw new Error('DBGM-00000 Codex login was cancelled');
    }

    return { authorizationUrl };
  }

  async function cancelLogin(strmid) {
    const attempt = await withAuthMutation(() => {
      const currentAttempt = pendingLogin;
      if (currentAttempt) closeAttempt(currentAttempt);
      return currentAttempt;
    });
    return publishStatus(attempt?.strmid || strmid);
  }

  return {
    cancelLogin,
    closePendingLogin() {
      if (pendingLogin) closeAttempt(pendingLogin);
    },
    isPending() {
      return !!pendingLogin;
    },
    startLogin,
  };
}

module.exports = {
  createLoginManager,
};
