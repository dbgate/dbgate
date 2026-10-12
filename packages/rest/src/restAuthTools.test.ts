const { createAuthRedirectGuard, isSameUrlOrigin } = require('./restAuthTools');
const { executeRestApiEndpointOpenApi } = require('./restApiExecutor');

// follow-redirects drops Authorization on a redirect to another host, but forwarded a custom API
// key header to wherever the response pointed
describe('createAuthRedirectGuard', () => {
  const apiKeyAuth = { type: 'apikey', header: 'X-Api-Key', value: 'secret' };

  test('removes the API key header when a redirect leaves the origin', () => {
    const guard = createAuthRedirectGuard('https://api.example.com/v1/items', apiKeyAuth);
    const options = { href: 'https://attacker.example/collect', headers: { 'x-api-key': 'secret', Accept: '*/*' } };
    guard(options);
    expect(options.headers).toEqual({ Accept: '*/*' });
  });

  test('keeps it for a redirect within the origin', () => {
    const guard = createAuthRedirectGuard('https://api.example.com/v1/items', apiKeyAuth);
    const options = { href: 'https://api.example.com/v1/items/', headers: { 'X-Api-Key': 'secret' } };
    guard(options);
    expect(options.headers).toEqual({ 'X-Api-Key': 'secret' });
  });

  test('removes Authorization of basic and bearer auth too', () => {
    const guard = createAuthRedirectGuard('https://api.example.com/', { type: 'bearer', token: 't' });
    const options = { href: 'http://api.example.com/', headers: { Authorization: 'Bearer t' } };
    guard(options);
    expect(options.headers).toEqual({});
  });

  test('is not needed without auth', () => {
    expect(createAuthRedirectGuard('https://api.example.com/', null)).toBeUndefined();
  });
});

// fetchGraphQLSchema gets the auth headers, not the auth definition, and sent them with no
// redirect guard at all
describe('fetchGraphQLSchema', () => {
  const { fetchGraphQLSchema } = require('./graphqlIntrospection');

  test('removes the auth headers it was given when a redirect leaves the origin', async () => {
    const axios = {
      post: jest.fn(async (url: string, body: any, config: any) => ({ data: { data: { __schema: {} } } })),
    };
    await fetchGraphQLSchema('https://api.example.com/graphql', { 'X-Api-Key': 'secret' }, axios);

    const { beforeRedirect } = axios.post.mock.calls[0][2];
    const options = {
      href: 'https://attacker.example/collect',
      headers: { 'X-Api-Key': 'secret', 'Content-Type': 'application/json' },
    };
    beforeRedirect(options);
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  test('needs no guard without auth headers', async () => {
    const axios = {
      post: jest.fn(async (url: string, body: any, config: any) => ({ data: { data: { __schema: {} } } })),
    };
    await fetchGraphQLSchema('https://api.example.com/graphql', {}, axios);
    expect(axios.post.mock.calls[0][2].beforeRedirect).toBeUndefined();
  });
});

test('isSameUrlOrigin', () => {
  expect(isSameUrlOrigin('https://api.example.com/a', 'https://api.example.com/b')).toBe(true);
  expect(isSameUrlOrigin('https://api.example.com/a', 'https://api.example.com:8443/a')).toBe(false);
  expect(isSameUrlOrigin('https://api.example.com/a', 'http://api.example.com/a')).toBe(false);
  expect(isSameUrlOrigin('/relative', 'https://api.example.com/')).toBe(false);
});

describe('executeRestApiEndpointOpenApi', () => {
  const definition = path => ({ categories: [{ name: 'c', endpoints: [{ method: 'get', path, parameters: [] }] }] });
  const auth = { type: 'bearer', token: 'secret' };

  test('refuses a request with credentials that would leave the server', async () => {
    const axios = jest.fn();
    // an absolute URL as the path of an endpoint in the definition replaces the server
    const path = 'https://attacker.example/x';
    await expect(
      executeRestApiEndpointOpenApi(definition(path), path, 'get', {}, 'https://api.example.com/', auth, axios)
    ).rejects.toThrow('not on the server');
    expect(axios).not.toHaveBeenCalled();
  });

  test('refuses a request without credentials that would leave the server', async () => {
    const axios = jest.fn();
    const path = 'http://169.254.169.254/latest/meta-data/';
    await expect(
      executeRestApiEndpointOpenApi(definition(path), path, 'get', {}, 'https://api.example.com/', null, axios)
    ).rejects.toThrow('not on the server');
    expect(axios).not.toHaveBeenCalled();
  });

  test('sends a request on the server with the redirect guard', async () => {
    const axios = jest.fn(async () => ({ status: 200, data: {} }));
    await executeRestApiEndpointOpenApi(
      definition('/items'),
      '/items',
      'get',
      {},
      'https://api.example.com/v1',
      auth,
      axios
    );
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://api.example.com/v1/items', beforeRedirect: expect.any(Function) })
    );
  });
});
