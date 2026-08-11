const axios = require('axios').default;
const { z } = require('zod');

const { CODEX_MODELS, DEFAULT_CODEX_MODEL } = require('dbgate-tools');
const socket = require('../utility/socket');
const processArgs = require('../utility/processArgs');
const { getAccessCredentials, invalidateCredentials } = require('./oauth');

const DEFAULT_RESPONSES_ENDPOINT = 'https://chatgpt.com/backend-api/codex/responses';
const activeRequests = new Map();
const requestIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const responseBodySchema = z.looseObject({});
const modelIdSchema = z.enum(CODEX_MODELS.map(model => model.id));
const startResponseParamsSchema = z.object({
  requestId: z.unknown().optional(),
  body: z.unknown().optional(),
  strmid: z.string().nullable().optional().default(null),
});
const cancelResponseParamsSchema = z.object({
  requestId: z.unknown().optional(),
});
const publicHeaderSchema = z.string();

function validateRequestId(requestId) {
  const result = requestIdSchema.safeParse(requestId);
  if (!result.success) {
    throw new Error('DBGM-00000 Invalid Codex response request ID');
  }
  return result.data;
}

function validateBody(body) {
  const bodyResult = responseBodySchema.safeParse(body);
  if (!bodyResult.success) {
    throw new Error('DBGM-00000 Codex Responses body must be a JSON object');
  }

  const modelResult = modelIdSchema.safeParse(bodyResult.data.model || DEFAULT_CODEX_MODEL);
  if (!modelResult.success) {
    throw new Error('DBGM-00000 Unsupported Codex model');
  }
  return {
    ...bodyResult.data,
    model: modelResult.data,
    store: false,
    stream: true,
  };
}

function parseStartResponseParams(params) {
  const result = startResponseParamsSchema.safeParse(params ?? {});
  if (!result.success) {
    throw new Error('DBGM-00000 Invalid Codex response request');
  }
  return result.data;
}

function parseCancelResponseParams(params) {
  const result = cancelResponseParamsSchema.safeParse(params ?? {});
  if (!result.success) {
    throw new Error('DBGM-00000 Invalid Codex response request');
  }
  return result.data;
}

function responseEventName(requestId) {
  return `codex-response-${requestId}`;
}

function emitResponse(context, payload) {
  socket.emit(responseEventName(context.requestId), { strmid: context.strmid, ...payload });
}

function finishResponse(context, payload) {
  if (context.finished) return;
  context.finished = true;
  activeRequests.delete(context.requestId);
  emitResponse(context, payload);
}

function getEndpoint() {
  if (processArgs.runE2eTests && process.env.DBGATE_CODEX_API_ENDPOINT) {
    return process.env.DBGATE_CODEX_API_ENDPOINT;
  }
  return DEFAULT_RESPONSES_ENDPOINT;
}

function requestHeaders(credentials, requestId) {
  return {
    Accept: 'text/event-stream',
    Authorization: `Bearer ${credentials.accessToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'DbGate',
    originator: 'dbgate',
    'session-id': requestId,
    ...(credentials.accountId ? { 'ChatGPT-Account-Id': credentials.accountId } : {}),
  };
}

async function openResponse(body, credentials, context) {
  return axios.request({
    method: 'POST',
    url: getEndpoint(),
    data: body,
    headers: requestHeaders(credentials, context.requestId),
    responseType: 'stream',
    signal: context.abortController.signal,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });
}

function discardResponse(response) {
  const stream = response?.data;
  if (!stream) return;
  stream.on?.('error', () => {});
  if (stream.resume) stream.resume();
  else if (stream.destroy) stream.destroy();
}

function publicHeaders(headers) {
  const result = {};
  for (const name of ['content-type', 'x-request-id', 'openai-request-id']) {
    const headerResult = publicHeaderSchema.safeParse(headers?.[name]);
    if (headerResult.success) result[name] = headerResult.data;
  }
  if (!result['content-type']) result['content-type'] = 'text/event-stream';
  return result;
}

function attachResponseStream(response, context) {
  const stream = response.data;
  context.stream = stream;

  stream.on('data', chunk => {
    if (!context.finished) {
      emitResponse(context, { type: 'chunk', data: Buffer.from(chunk).toString('base64') });
    }
  });
  stream.once('end', () => finishResponse(context, { type: 'end' }));
  stream.once('aborted', () => {
    finishResponse(context, { type: 'error', errorMessage: 'DBGM-00000 Codex response stream was interrupted' });
  });
  stream.once('error', () => {
    finishResponse(context, { type: 'error', errorMessage: 'DBGM-00000 Codex response stream failed' });
  });
}

async function startResponse(params) {
  const { requestId: uncheckedRequestId, body, strmid } = parseStartResponseParams(params);
  const requestId = validateRequestId(uncheckedRequestId);
  if (activeRequests.has(requestId)) {
    throw new Error('DBGM-00000 A Codex response with this request ID is already active');
  }

  const checkedBody = validateBody(body);
  const context = {
    abortController: new AbortController(),
    finished: false,
    requestId,
    stream: null,
    strmid,
  };
  activeRequests.set(requestId, context);

  let response = null;
  let responseAttached = false;
  try {
    let credentials = await getAccessCredentials();
    if (context.abortController.signal.aborted) {
      throw new Error('DBGM-00000 Codex response cancelled');
    }
    response = await openResponse(checkedBody, credentials, context);

    if (response.status === 401) {
      discardResponse(response);
      response = null;
      credentials = await getAccessCredentials({ forceRefresh: true });
      if (context.abortController.signal.aborted) {
        throw new Error('DBGM-00000 Codex response cancelled');
      }
      response = await openResponse(checkedBody, credentials, context);
      if (response.status === 401) {
        await invalidateCredentials({
          strmid,
          errorMessage: 'DBGM-00000 Codex authentication expired; connect ChatGPT again',
          expectedRevision: credentials.authRevision,
        });
      }
    }

    attachResponseStream(response, context);
    responseAttached = true;
    return { status: response.status, headers: publicHeaders(response.headers) };
  } catch (error) {
    const errorMessage = context.abortController.signal.aborted
      ? 'DBGM-00000 Codex response cancelled'
      : error?.message?.startsWith('DBGM-00000')
      ? error.message
      : 'DBGM-00000 Could not start the Codex response';
    finishResponse(context, { type: 'error', errorMessage });
    throw new Error(errorMessage);
  } finally {
    if (response && !responseAttached) discardResponse(response);
  }
}

async function cancelResponse(params) {
  const { requestId: uncheckedRequestId } = parseCancelResponseParams(params);
  const requestId = validateRequestId(uncheckedRequestId);
  const context = activeRequests.get(requestId);
  if (!context) return { cancelled: false };

  context.abortController.abort();
  context.stream?.destroy?.();
  finishResponse(context, { type: 'error', errorMessage: 'DBGM-00000 Codex response cancelled' });
  return { cancelled: true };
}

async function cancelAllResponses() {
  const contexts = Array.from(activeRequests.values());
  for (const context of contexts) {
    context.abortController.abort();
    context.stream?.destroy?.();
    finishResponse(context, { type: 'error', errorMessage: 'DBGM-00000 Codex response cancelled' });
  }
  return { cancelledCount: contexts.length };
}

module.exports = {
  cancelAllResponses,
  cancelResponse,
  startResponse,
};
