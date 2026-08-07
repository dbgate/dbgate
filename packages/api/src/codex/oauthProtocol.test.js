const crypto = require('crypto');

const mockPost = jest.fn();

jest.mock('axios', () => ({ default: { post: mockPost } }));

const {
  CALLBACK_URL,
  createAuthorizationRequest,
  exchangeAuthorizationCode,
  extractAccountId,
  refreshAccessCredentials,
} = require('./oauthProtocol');

function jwtWithClaims(claims) {
  return `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
}

describe('Codex OAuth protocol', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates a PKCE authorization request for the registered localhost callback', () => {
    const request = createAuthorizationRequest();
    const authorizationUrl = new URL(request.authorizationUrl);
    const expectedChallenge = crypto.createHash('sha256').update(request.verifier).digest('base64url');

    expect(authorizationUrl.origin).toBe('https://auth.openai.com');
    expect(authorizationUrl.pathname).toBe('/oauth/authorize');
    expect(authorizationUrl.searchParams.get('redirect_uri')).toBe(CALLBACK_URL);
    expect(authorizationUrl.searchParams.get('state')).toBe(request.state);
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorizationUrl.searchParams.get('code_challenge')).toBe(expectedChallenge);
  });

  test('exchanges an authorization code without exposing extra provider fields', async () => {
    mockPost.mockResolvedValue({
      status: 200,
      data: {
        access_token: 'access-secret',
        refresh_token: 'refresh-secret',
        expires_in: 120,
        provider_private_value: 'must-not-persist',
      },
    });

    const credentials = await exchangeAuthorizationCode('authorization-code', 'pkce-verifier');
    const requestParameters = new URLSearchParams(mockPost.mock.calls[0][1]);

    expect(requestParameters.get('code')).toBe('authorization-code');
    expect(requestParameters.get('code_verifier')).toBe('pkce-verifier');
    expect(credentials).toMatchObject({ accessToken: 'access-secret', refreshToken: 'refresh-secret' });
    expect(credentials).not.toHaveProperty('provider_private_value');
  });

  test('keeps the previous refresh token and defaults malformed expiry', async () => {
    const previous = {
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      expiresAt: Date.now() - 1,
      accountId: 'old-account',
    };
    const beforeRefresh = Date.now();
    mockPost.mockResolvedValue({
      status: 200,
      data: {
        access_token: 'new-access',
        refresh_token: { malformed: true },
        expires_in: 'not-a-number',
      },
    });

    const credentials = await refreshAccessCredentials(previous);

    expect(credentials).toMatchObject({
      accessToken: 'new-access',
      refreshToken: 'old-refresh',
      accountId: 'old-account',
    });
    expect(credentials.expiresAt).toBeGreaterThanOrEqual(beforeRefresh + 3_600_000);
    expect(credentials.expiresAt).toBeLessThanOrEqual(Date.now() + 3_600_000);
  });

  test('validates token responses and extracts only supported account claims', async () => {
    mockPost.mockResolvedValue({
      status: 200,
      data: { access_token: { providerSecret: 'private-detail' }, refresh_token: 'refresh-secret' },
    });

    await expect(exchangeAuthorizationCode('authorization-code', 'pkce-verifier')).rejects.toThrow(
      'DBGM-00000 Codex authentication did not return an access token'
    );
    expect(
      extractAccountId({
        access_token: jwtWithClaims({
          email: 'private@example.com',
          organizations: [{ id: 'account-123', private: 'ignored' }],
        }),
      })
    ).toBe('account-123');
  });
});
