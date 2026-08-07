const { PassThrough } = require('stream');

const mockAxiosRequest = jest.fn();
const mockSocketEmit = jest.fn();
const mockGetAccessCredentials = jest.fn();
const mockInvalidateCredentials = jest.fn();

jest.mock('axios', () => ({ default: { request: mockAxiosRequest } }));
jest.mock('dbgate-tools', () => ({
  CODEX_MODELS: [{ id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol' }],
  DEFAULT_CODEX_MODEL: 'gpt-5.6-sol',
}));
jest.mock('../utility/processArgs', () => ({ runE2eTests: true }));
jest.mock('../utility/socket', () => ({ emit: mockSocketEmit }));
jest.mock('./oauth', () => ({
  getAccessCredentials: mockGetAccessCredentials,
  invalidateCredentials: mockInvalidateCredentials,
}));

const responses = require('./responses');

function upstream(status = 200, headers = { 'content-type': 'text/event-stream' }) {
  return { status, headers, data: new PassThrough() };
}

function tick() {
  return new Promise(resolve => setImmediate(resolve));
}

describe('Codex Responses proxy', () => {
  const previousEndpoint = process.env.DBGATE_CODEX_API_ENDPOINT;

  beforeAll(() => {
    process.env.DBGATE_CODEX_API_ENDPOINT = 'http://127.0.0.1:3110/backend-api/codex/responses';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccessCredentials.mockResolvedValue({
      accessToken: 'access-secret',
      refreshToken: 'refresh-secret',
      expiresAt: Date.now() + 60_000,
      accountId: 'account-1',
      authRevision: 7,
    });
    mockInvalidateCredentials.mockResolvedValue(true);
  });

  afterAll(() => {
    if (previousEndpoint == null) delete process.env.DBGATE_CODEX_API_ENDPOINT;
    else process.env.DBGATE_CODEX_API_ENDPOINT = previousEndpoint;
  });

  test.each([undefined, null, '', 'contains spaces', 'contains/slash', 42, 'x'.repeat(129)])(
    'rejects malformed request ID %#',
    async requestId => {
      await expect(responses.startResponse({ requestId, body: { input: 'hello' } })).rejects.toThrow(
        'DBGM-00000 Invalid Codex response request ID'
      );

      expect(mockGetAccessCredentials).not.toHaveBeenCalled();
      expect(mockAxiosRequest).not.toHaveBeenCalled();
      expect(mockSocketEmit).not.toHaveBeenCalled();
    }
  );

  test('rejects malformed response parameters without exposing validation details', async () => {
    await expect(
      responses.startResponse({ requestId: 'valid-request', body: { input: 'hello' }, strmid: 42 })
    ).rejects.toThrow('DBGM-00000 Invalid Codex response request');

    expect(mockGetAccessCredentials).not.toHaveBeenCalled();
    expect(mockAxiosRequest).not.toHaveBeenCalled();
  });

  test.each([undefined, null, [], 'not-an-object', 42])('rejects malformed Responses body %#', async body => {
    await expect(responses.startResponse({ requestId: 'malformed-body', body })).rejects.toThrow(
      'DBGM-00000 Codex Responses body must be a JSON object'
    );

    expect(mockGetAccessCredentials).not.toHaveBeenCalled();
    expect(mockAxiosRequest).not.toHaveBeenCalled();
    expect(mockSocketEmit).not.toHaveBeenCalled();
  });

  test.each(['unknown-model', 42, {}, []])('rejects unsupported model shape %#', async model => {
    await expect(
      responses.startResponse({ requestId: 'unsupported-model', body: { model, input: 'hello' } })
    ).rejects.toThrow('DBGM-00000 Unsupported Codex model');

    expect(mockGetAccessCredentials).not.toHaveBeenCalled();
    expect(mockAxiosRequest).not.toHaveBeenCalled();
  });

  test('passes the Responses body through while forcing the safe streaming flags and default model', async () => {
    const response = upstream();
    mockAxiosRequest.mockResolvedValue(response);
    const body = {
      input: [
        {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'inspect this schema' }],
        },
      ],
      instructions: 'Use the provided tools.',
      tools: [{ type: 'function', name: 'get_table_schema', parameters: { type: 'object' } }],
      tool_choice: 'auto',
      include: ['reasoning.encrypted_content'],
      metadata: { trace: 'codex-test' },
      extra_body_field: { preserved: true },
      store: true,
      stream: false,
    };

    await responses.startResponse({ requestId: 'body-passthrough', strmid: 'stream-body', body });

    expect(mockAxiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          ...body,
          model: 'gpt-5.6-sol',
          store: false,
          stream: true,
        },
      })
    );
    expect(body).toMatchObject({ store: true, stream: false });

    response.data.end();
    await tick();
  });

  test('relays raw chunks through a request-scoped event without returning secrets', async () => {
    const response = upstream(200, {
      'content-type': 'text/event-stream',
      'set-cookie': 'private-cookie',
      'x-request-id': 'request-from-upstream',
    });
    mockAxiosRequest.mockResolvedValue(response);

    const result = await responses.startResponse({
      requestId: 'request-1',
      strmid: 'stream-1',
      body: { model: 'gpt-5.6-sol', input: 'hello' },
    });

    expect(mockAxiosRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://127.0.0.1:3110/backend-api/codex/responses',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-secret',
          'ChatGPT-Account-Id': 'account-1',
        }),
        data: expect.objectContaining({ store: false, stream: true }),
      })
    );
    expect(result).toEqual({
      status: 200,
      headers: { 'content-type': 'text/event-stream', 'x-request-id': 'request-from-upstream' },
    });
    expect(JSON.stringify(result)).not.toContain('access-secret');
    expect(JSON.stringify(result)).not.toContain('private-cookie');

    response.data.write(Buffer.from('data: hello\n\n'));
    response.data.end();
    await tick();

    expect(mockSocketEmit).toHaveBeenCalledWith('codex-response-request-1', {
      strmid: 'stream-1',
      type: 'chunk',
      data: Buffer.from('data: hello\n\n').toString('base64'),
    });
    expect(mockSocketEmit).toHaveBeenCalledWith('codex-response-request-1', {
      strmid: 'stream-1',
      type: 'end',
    });
  });

  test('refreshes once after 401 and invalidates credentials after a second 401', async () => {
    const first = upstream(401);
    const second = upstream(401, { 'content-type': 'application/json' });
    mockAxiosRequest.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    const result = await responses.startResponse({
      requestId: 'request-401',
      strmid: 'stream-401',
      body: { input: 'hello' },
    });

    expect(result.status).toBe(401);
    expect(mockGetAccessCredentials).toHaveBeenNthCalledWith(1);
    expect(mockGetAccessCredentials).toHaveBeenNthCalledWith(2, { forceRefresh: true });
    expect(mockInvalidateCredentials).toHaveBeenCalledWith({
      strmid: 'stream-401',
      errorMessage: 'DBGM-00000 Codex authentication expired; connect ChatGPT again',
      expectedRevision: 7,
    });
    second.data.end('{"error":"unauthorized"}');
    await tick();
  });

  test('disposes the retry stream when second-401 invalidation fails', async () => {
    const first = upstream(401);
    const second = upstream(401);
    const retryResume = jest.spyOn(second.data, 'resume');
    mockAxiosRequest.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    mockInvalidateCredentials.mockRejectedValueOnce(new Error('credential store unavailable'));

    await expect(
      responses.startResponse({ requestId: 'request-dispose', strmid: 'stream-dispose', body: { input: 'hello' } })
    ).rejects.toThrow('DBGM-00000 Could not start the Codex response');

    expect(retryResume).toHaveBeenCalledTimes(1);
  });

  test('sanitizes unexpected upstream errors and releases the request ID', async () => {
    mockAxiosRequest.mockRejectedValueOnce(new Error('upstream-secret-detail'));

    await expect(
      responses.startResponse({ requestId: 'sanitized-error', strmid: 'stream-error', body: { input: 'hello' } })
    ).rejects.toThrow('DBGM-00000 Could not start the Codex response');

    expect(mockSocketEmit).toHaveBeenCalledWith('codex-response-sanitized-error', {
      strmid: 'stream-error',
      type: 'error',
      errorMessage: 'DBGM-00000 Could not start the Codex response',
    });
    expect(JSON.stringify(mockSocketEmit.mock.calls)).not.toContain('upstream-secret-detail');

    const retry = upstream();
    mockAxiosRequest.mockResolvedValueOnce(retry);
    await expect(
      responses.startResponse({ requestId: 'sanitized-error', strmid: 'stream-error', body: { input: 'retry' } })
    ).resolves.toMatchObject({ status: 200 });
    retry.data.end();
    await tick();
  });

  test('sanitizes unexpected credential-loading errors', async () => {
    mockGetAccessCredentials.mockRejectedValueOnce(new Error('credential-file-secret-detail'));

    await expect(
      responses.startResponse({ requestId: 'credential-error', strmid: 'stream-credential', body: { input: 'hello' } })
    ).rejects.toThrow('DBGM-00000 Could not start the Codex response');

    expect(mockAxiosRequest).not.toHaveBeenCalled();
    expect(JSON.stringify(mockSocketEmit.mock.calls)).not.toContain('credential-file-secret-detail');
  });

  test('rejects duplicate IDs and disconnect cancellation closes active streams', async () => {
    const response = upstream();
    mockAxiosRequest.mockResolvedValue(response);
    await responses.startResponse({ requestId: 'duplicate', strmid: 'stream-2', body: { input: 'hello' } });

    await expect(
      responses.startResponse({ requestId: 'duplicate', strmid: 'stream-2', body: { input: 'again' } })
    ).rejects.toThrow('DBGM-00000 A Codex response with this request ID is already active');

    await expect(responses.cancelAllResponses()).resolves.toEqual({ cancelledCount: 1 });
    expect(mockSocketEmit).toHaveBeenCalledWith('codex-response-duplicate', {
      strmid: 'stream-2',
      type: 'error',
      errorMessage: 'DBGM-00000 Codex response cancelled',
    });
  });
});
