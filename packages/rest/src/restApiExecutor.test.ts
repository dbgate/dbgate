const { executeODataApiEndpoint } = require('./restApiExecutor');

function createDefinition() {
  return {
    categories: [
      {
        name: 'EntitySet',
        endpoints: [
          {
            method: 'GET',
            path: '/customers',
            parameters: [
              {
                name: 'company',
                in: 'query',
                dataType: 'string',
                required: true,
              },
            ],
          },
          {
            method: 'GET',
            path: '/$metadata',
            parameters: [],
          },
        ],
      },
    ],
  };
}

test('adds OData system query options from parameterValues', async () => {
  const calls = [];
  const axios = async args => {
    calls.push(args);
    return { status: 200, data: {} };
  };

  await executeODataApiEndpoint(
    createDefinition(),
    '/customers',
    'GET',
    {
      company: '123',
      '$top': 50,
      '$skip': '10',
      '$count': true,
      '$select': ['id', 'displayName'],
      '$orderby': 'displayName asc',
      '$filter': 'displayName ne null',
      '$search': 'dino',
      '$expand': 'addresses',
      '$format': 'application/json',
    },
    'https://example.test/odata',
    null,
    axios
  );

  expect(calls).toHaveLength(1);
  const requestUrl = String(calls[0].url);
  const parsed = new URL(requestUrl);

  expect(parsed.pathname).toBe('/odata/customers');
  expect(parsed.searchParams.get('company')).toBe('123');
  expect(parsed.searchParams.get('$top')).toBe('50');
  expect(parsed.searchParams.get('$skip')).toBe('10');
  expect(parsed.searchParams.get('$count')).toBe('true');
  expect(parsed.searchParams.get('$select')).toBe('id,displayName');
  expect(parsed.searchParams.get('$orderby')).toBe('displayName asc');
  expect(parsed.searchParams.get('$filter')).toBe('displayName ne null');
  expect(parsed.searchParams.get('$search')).toBe('dino');
  expect(parsed.searchParams.get('$expand')).toBe('addresses');
  expect(parsed.searchParams.get('$format')).toBe('application/json');
});

test('accepts non-dollar aliases and ignores invalid system option values', async () => {
  const calls = [];
  const axios = async args => {
    calls.push(args);
    return { status: 200, data: {} };
  };

  await executeODataApiEndpoint(
    createDefinition(),
    '/customers',
    'GET',
    {
      company: '123',
      top: 'abc',
      skip: -1,
      count: 'yes',
      select: ['id'],
      filter: 'id ne null',
    },
    'https://example.test/odata',
    null,
    axios
  );

  expect(calls).toHaveLength(1);
  const parsed = new URL(String(calls[0].url));
  expect(parsed.searchParams.get('$top')).toBeNull();
  expect(parsed.searchParams.get('$skip')).toBeNull();
  expect(parsed.searchParams.get('$count')).toBeNull();
  expect(parsed.searchParams.get('$select')).toBe('id');
  expect(parsed.searchParams.get('$filter')).toBe('id ne null');
});

test('does not add OData system query options to $metadata endpoint', async () => {
  const calls = [];
  const axios = async args => {
    calls.push(args);
    return { status: 200, data: {} };
  };

  await executeODataApiEndpoint(
    createDefinition(),
    '/$metadata',
    'GET',
    {
      '$top': 10,
      '$count': true,
    },
    'https://example.test/odata',
    null,
    axios
  );

  expect(calls).toHaveLength(1);
  const parsed = new URL(String(calls[0].url));
  expect(parsed.pathname).toBe('/odata/$metadata');
  expect(parsed.search).toBe('');
});
