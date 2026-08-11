const crypto = require('crypto');
const axios = require('axios').default;
const { z } = require('zod');

const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const ISSUER = 'https://auth.openai.com';
const CALLBACK_HOST = '127.0.0.1';
const CALLBACK_PORT = 1455;
const CALLBACK_PATH = '/auth/callback';
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;

const nonEmptyStringSchema = z.string().min(1);
const jwtClaimsSchema = z.object({
  chatgpt_account_id: nonEmptyStringSchema.optional().catch(undefined),
  'https://api.openai.com/auth': z
    .object({
      chatgpt_account_id: nonEmptyStringSchema.optional().catch(undefined),
    })
    .optional()
    .catch(undefined),
  organizations: z
    .array(
      z.object({
        id: nonEmptyStringSchema.optional().catch(undefined),
      })
    )
    .optional()
    .catch(undefined),
});
const oauthTokenResponseSchema = z.object({
  access_token: nonEmptyStringSchema,
  refresh_token: nonEmptyStringSchema.optional().catch(undefined),
  expires_in: z.coerce.number().positive().finite().catch(3600),
  id_token: z.string().optional().catch(undefined),
});

function base64Url(value) {
  return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createPkce() {
  const verifier = base64Url(crypto.randomBytes(64));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function parseJwtClaims(token) {
  const tokenResult = z.string().safeParse(token);
  if (!tokenResult.success) return null;

  const parts = tokenResult.data.split('.');
  if (parts.length !== 3) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    const result = jwtClaimsSchema.safeParse(JSON.parse(Buffer.from(normalized + padding, 'base64').toString('utf8')));
    return result.success ? result.data : null;
  } catch (error) {
    return null;
  }
}

function extractAccountIdFromClaims(claims) {
  const result = jwtClaimsSchema.safeParse(claims);
  if (!result.success) return null;

  const checkedClaims = result.data;
  return (
    checkedClaims.chatgpt_account_id ||
    checkedClaims['https://api.openai.com/auth']?.chatgpt_account_id ||
    checkedClaims.organizations?.[0]?.id ||
    null
  );
}

function extractAccountId(tokens) {
  return (
    extractAccountIdFromClaims(parseJwtClaims(tokens?.id_token)) ||
    extractAccountIdFromClaims(parseJwtClaims(tokens?.access_token)) ||
    null
  );
}

function credentialsFromTokens(tokens, previous = null) {
  const result = oauthTokenResponseSchema.safeParse(tokens);
  if (!result.success) {
    throw new Error('DBGM-00000 Codex authentication did not return an access token');
  }

  const checkedTokens = result.data;
  const refreshToken = checkedTokens.refresh_token || previous?.refreshToken;
  if (!refreshToken) {
    throw new Error('DBGM-00000 Codex authentication did not return a refresh token');
  }

  return {
    accessToken: checkedTokens.access_token,
    refreshToken,
    expiresAt: Date.now() + checkedTokens.expires_in * 1000,
    accountId: extractAccountId(checkedTokens) || previous?.accountId || undefined,
  };
}

async function requestTokens(parameters, signal) {
  let response;
  try {
    response = await axios.post(`${ISSUER}/oauth/token`, new URLSearchParams(parameters).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'DbGate',
      },
      signal,
      timeout: 60 * 1000,
      validateStatus: () => true,
    });
  } catch (error) {
    throw new Error('DBGM-00000 Could not reach the Codex authentication service');
  }

  if (response.status < 200 || response.status >= 300) {
    const error = new Error(`DBGM-00000 Codex authentication failed with HTTP ${response.status}`);
    error.codexHttpStatus = response.status;
    throw error;
  }
  return response.data;
}

function createAuthorizationRequest() {
  const { verifier, challenge } = createPkce();
  const state = base64Url(crypto.randomBytes(32));
  const parameters = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: 'openid profile email offline_access',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    id_token_add_organizations: 'true',
    codex_cli_simplified_flow: 'true',
    state,
    originator: 'dbgate',
  });
  return {
    authorizationUrl: `${ISSUER}/oauth/authorize?${parameters.toString()}`,
    state,
    verifier,
  };
}

async function exchangeAuthorizationCode(code, verifier, signal) {
  const tokens = await requestTokens(
    {
      grant_type: 'authorization_code',
      code,
      redirect_uri: CALLBACK_URL,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    },
    signal
  );
  return credentialsFromTokens(tokens);
}

async function refreshAccessCredentials(previous) {
  const tokens = await requestTokens({
    grant_type: 'refresh_token',
    refresh_token: previous.refreshToken,
    client_id: CLIENT_ID,
  });
  return credentialsFromTokens(tokens, previous);
}

module.exports = {
  CALLBACK_HOST,
  CALLBACK_PATH,
  CALLBACK_PORT,
  CALLBACK_URL,
  createAuthorizationRequest,
  exchangeAuthorizationCode,
  extractAccountId,
  refreshAccessCredentials,
};
