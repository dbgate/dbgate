// Regression tests for the server URL of REST / OData / GraphQL requests. It came from the
// client and was used as it was, with the connection's credentials attached and the response
// returned - so any user of a connection could send its API key to their own server, or read
// services on the network of DbGate.

const resolveRestRequestServer = require('./restRequestServer');

const graphqlConnection = { apiServerUrl1: 'https://api.example.com/graphql' };
const openApiConnection = {
  apiServerUrl1: 'https://api.example.com/docs/openapi.json',
  apiServerUrl2: 'https://eu.api.example.com/',
};
const openApiInfo = { servers: [{ url: '/v1' }, { url: 'https://sandbox.example.com/v2' }] };

describe('servers configured for the connection', () => {
  test('the connection URL, as GraphQL and OData tabs send it', () => {
    expect(resolveRestRequestServer('https://api.example.com/graphql', graphqlConnection, null)).toBe(
      'https://api.example.com/graphql'
    );
  });

  test('the second connection URL and the servers of the definition, as the OpenAPI tab sends them', () => {
    // the OpenAPI tab resolves the server against the definition URL (RestApiEndpointTab)
    const fromDefinition = new URL('/v1', openApiConnection.apiServerUrl1).toString();
    expect(resolveRestRequestServer(fromDefinition, openApiConnection, openApiInfo)).toBe('https://api.example.com/v1');
    expect(resolveRestRequestServer('https://sandbox.example.com/v2', openApiConnection, openApiInfo)).toBe(
      'https://sandbox.example.com/v2'
    );
    expect(resolveRestRequestServer('https://eu.api.example.com', openApiConnection, openApiInfo)).toBe(
      'https://eu.api.example.com/'
    );
  });

  test('no server keeps the caller default', () => {
    expect(resolveRestRequestServer(undefined, graphqlConnection, null)).toBeUndefined();
    expect(resolveRestRequestServer('', graphqlConnection, null)).toBe('');
  });
});

describe('other servers are refused', () => {
  test.each([
    'https://attacker.example/x',
    'http://127.0.0.1:9200/_search',
    'http://169.254.169.254/latest/meta-data/',
    'https://api.example.com.attacker.example/graphql',
    'https://api.example.com/graphql/../admin',
    'not a url',
  ])('%s', server => {
    expect(() => resolveRestRequestServer(server, graphqlConnection, null)).toThrow('not one configured');
  });

  test('a server of the definition does not allow its neighbours', () => {
    expect(() => resolveRestRequestServer('https://sandbox.example.com/v3', openApiConnection, openApiInfo)).toThrow(
      'not one configured'
    );
  });
});
