const { extractErrorLogData } = require('./stringTools');

// An axios error is logged as an object holding the request it failed on, headers included, so
// the Authorization header of e.g. a license or cloud call ended up in the logs.
test('the request headers of an HTTP client error are not logged', () => {
  const err = Object.assign(new Error('Request failed with status code 401'), {
    isAxiosError: true,
    code: 'ERR_BAD_REQUEST',
    config: {
      method: 'post',
      url: 'https://api.example.com/refresh?key=secret-in-query',
      headers: { Authorization: 'Bearer secret-token', 'x-api-key': 'secret-key' },
      data: '{"password":"secret-body"}',
    },
    request: { _header: 'Authorization: Bearer secret-token' },
    response: { status: 401, statusText: 'Unauthorized', headers: { 'set-cookie': 'secret-cookie' }, data: {} },
  });

  const logged = extractErrorLogData(err, { conid: 'c1' });

  expect(JSON.stringify(logged)).not.toMatch(/secret/);
  expect(logged.errorObject).toEqual({
    name: 'Error',
    message: 'Request failed with status code 401',
    code: 'ERR_BAD_REQUEST',
    status: 401,
    statusText: 'Unauthorized',
    method: 'post',
    url: 'https://api.example.com/refresh',
  });
  expect(logged.conid).toBe('c1');
});

test.each([
  ['https://user:secret@api.example.com/path?key=secret', 'https://api.example.com/path'],
  ['https://api.example.com/cb#access_token=secret', 'https://api.example.com/cb'],
  ['/relative/path?key=secret#secret', '/relative/path'],
  ['//user:secret@host/x', '//host/x'],
])('credentials in the URL %s are not logged', (url, expected) => {
  const err = Object.assign(new Error('Request failed'), { isAxiosError: true, config: { url } });
  const logged = extractErrorLogData(err);
  expect(logged.errorObject.url).toBe(expected);
  expect(JSON.stringify(logged)).not.toMatch(/secret/);
});

test('other errors are logged as they are', () => {
  const err = new Error('connect ECONNREFUSED');
  expect(extractErrorLogData(err).errorObject).toBe(err);
});
