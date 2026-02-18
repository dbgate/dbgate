import type { AxiosInstance } from 'axios';
import { RestApiAuthorization, RestApiDefinition, RestApiParameter } from './restApiDef';

function hasValue(value: any) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function normalizeValueForRequest(value: any, parameter: RestApiParameter): any {
  if (!hasValue(value)) return undefined;

  if (parameter.isStringList) {
    if (Array.isArray(value)) return value.filter(item => item != null && String(item).trim() !== '');
    return [String(value)];
  }

  if (parameter.in === 'body' && typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    if ((parameter.contentType || '').includes('json') || parameter.dataType === 'object') {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }
  }

  return value;
}

function splitPathAndQuery(path: string) {
  const value = String(path || '');
  const index = value.indexOf('?');
  if (index < 0) {
    return {
      pathOnly: value,
      queryString: '',
    };
  }
  return {
    pathOnly: value.slice(0, index),
    queryString: value.slice(index + 1),
  };
}

function addAuthHeaders(headers: Record<string, string>, auth: RestApiAuthorization | null) {
  if (!auth) return;

  if (auth.type === 'basic') {
    const basicAuth = Buffer.from(`${auth.user}:${auth.password}`).toString('base64');
    headers['Authorization'] = `Basic ${basicAuth}`;
  } else if (auth.type === 'bearer') {
    headers['Authorization'] = `Bearer ${auth.token}`;
  } else if (auth.type === 'apikey') {
    headers[auth.header] = auth.value;
  }
}

function findEndpointDefinition(
  definition: RestApiDefinition,
  endpoint: string,
  method: string
) {
  return definition.categories
    .flatMap(category => category.endpoints)
    .find(ep => ep.path === endpoint && ep.method === method);
}

function buildRequestUrl(server: string, pathOnly: string) {
  const normalizedServer = String(server || '').trim();
  const normalizedPath = String(pathOnly || '').trim();

  if (!normalizedServer) {
    return normalizedPath;
  }

  try {
    const baseUrl = normalizedServer.endsWith('/') ? normalizedServer : `${normalizedServer}/`;
    const relativePath = normalizedPath.replace(/^\//, '');
    return new URL(relativePath, baseUrl).toString();
  } catch {
    return normalizedServer + normalizedPath;
  }
}

function appendQueryAndCookies(
  url: string,
  query: URLSearchParams,
  cookies: string[],
  headers: Record<string, string>
) {
  const queryStringValue = query.toString();
  if (queryStringValue) {
    const separator = url.includes('?') ? '&' : '?';
    url += separator + queryStringValue;
  }

  if (cookies.length > 0) {
    headers['Cookie'] = cookies.join('; ');
  }

  return url;
}

const ODATA_SYSTEM_QUERY_OPTIONS = new Set([
  '$filter',
  '$select',
  '$expand',
  '$orderby',
  '$top',
  '$skip',
  '$count',
  '$search',
  '$format',
]);

const ODATA_SYSTEM_QUERY_ALIASES: Record<string, string> = {
  filter: '$filter',
  select: '$select',
  expand: '$expand',
  orderby: '$orderby',
  top: '$top',
  skip: '$skip',
  count: '$count',
  search: '$search',
  format: '$format',
};

function resolveODataQueryOptionKey(rawKey: string): string | null {
  const key = String(rawKey || '').trim();
  if (!key) return null;

  const keyLower = key.toLowerCase();
  if (ODATA_SYSTEM_QUERY_OPTIONS.has(keyLower)) {
    return keyLower;
  }

  return ODATA_SYSTEM_QUERY_ALIASES[keyLower] || null;
}

function normalizeODataQueryOptionValue(optionKey: string, value: any): string | null {
  if (!hasValue(value)) return null;

  if (Array.isArray(value)) {
    const items = value.filter(item => hasValue(item)).map(item => String(item).trim()).filter(Boolean);
    if (items.length === 0) return null;
    return items.join(',');
  }

  if (optionKey === '$count') {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    const lowered = String(value).trim().toLowerCase();
    if (lowered === 'true' || lowered === 'false') return lowered;
    return null;
  }

  if (optionKey === '$top' || optionKey === '$skip') {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return String(Math.trunc(numeric));
    }
    return null;
  }

  return String(value).trim();
}

function applyODataSystemQueryOptions(query: URLSearchParams, parameterValues: Record<string, any>) {
  for (const [rawKey, rawValue] of Object.entries(parameterValues || {})) {
    const optionKey = resolveODataQueryOptionKey(rawKey);
    if (!optionKey) continue;

    const normalizedValue = normalizeODataQueryOptionValue(optionKey, rawValue);
    if (!hasValue(normalizedValue)) continue;

    query.set(optionKey, String(normalizedValue));
  }
}

export async function executeRestApiEndpointOpenApi(
  definition: RestApiDefinition,
  endpoint: string,
  method: string,
  parameterValues: Record<string, any>,
  server: string,
  auth: RestApiAuthorization | null,
  axios: AxiosInstance
): Promise<any> {
  const endpointDef = findEndpointDefinition(definition, endpoint, method);
  if (!endpointDef) {
    throw new Error(`Endpoint ${method} ${endpoint} not found in definition.`);
  }

  const { pathOnly, queryString } = splitPathAndQuery(endpointDef.path);
  let url = buildRequestUrl(server, pathOnly);
  const headers: Record<string, string> = {};
  const query = new URLSearchParams(queryString);
  const cookies: string[] = [];
  let body: any = undefined;

  for (const param of endpointDef.parameters) {
    const value = normalizeValueForRequest(parameterValues[param.name], param);
    if (!hasValue(value) && param.in !== 'path') {
      continue;
    }

    if (param.in === 'path') {
      url = url.replace(`{${param.name}}`, encodeURIComponent(value));
    } else if (param.in === 'query') {
      if (Array.isArray(value)) {
        for (const item of value) {
          query.append(param.name, String(item));
        }
      } else {
        query.append(param.name, String(value));
      }
    } else if (param.in === 'header') {
      headers[param.name] = Array.isArray(value) ? value.map(item => String(item)).join(',') : String(value);
    } else if (param.in === 'cookie') {
      if (Array.isArray(value)) {
        for (const item of value) {
          cookies.push(`${encodeURIComponent(param.name)}=${encodeURIComponent(String(item))}`);
        }
      } else {
        cookies.push(`${encodeURIComponent(param.name)}=${encodeURIComponent(String(value))}`);
      }
    } else if (param.in === 'body') {
      body = value;
      if (param.contentType && !headers['Content-Type']) {
        headers['Content-Type'] = param.contentType;
      }
    }
  }

  url = appendQueryAndCookies(url, query, cookies, headers);
  addAuthHeaders(headers, auth);

  const resp = await axios({
    method,
    url,
    headers,
    data: body,
  });

  return resp;
}

export async function executeODataApiEndpoint(
  definition: RestApiDefinition,
  endpoint: string,
  method: string,
  parameterValues: Record<string, any>,
  server: string,
  auth: RestApiAuthorization | null,
  axios: AxiosInstance
): Promise<any> {
  const endpointDef = findEndpointDefinition(definition, endpoint, method);
  if (!endpointDef) {
    throw new Error(`Endpoint ${method} ${endpoint} not found in definition.`);
  }

  const { pathOnly, queryString } = splitPathAndQuery(endpointDef.path);
  const metadataPath = pathOnly.replace(/\/+$/, '') === '/$metadata';

  let url = buildRequestUrl(server, pathOnly);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'OData-Version': '4.0',
  };
  const query = metadataPath ? new URLSearchParams() : new URLSearchParams(queryString);
  const cookies: string[] = [];
  let body: any = undefined;

  for (const param of endpointDef.parameters) {
    const value = normalizeValueForRequest(parameterValues[param.name], param);
    if (!hasValue(value) && param.in !== 'path') {
      continue;
    }

    if (param.in === 'path') {
      url = url.replace(`{${param.name}}`, encodeURIComponent(value));
    } else if (param.in === 'query') {
      if (metadataPath) continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          query.append(param.name, String(item));
        }
      } else {
        query.append(param.name, String(value));
      }
    } else if (param.in === 'header') {
      headers[param.name] = Array.isArray(value) ? value.map(item => String(item)).join(',') : String(value);
    } else if (param.in === 'cookie') {
      if (Array.isArray(value)) {
        for (const item of value) {
          cookies.push(`${encodeURIComponent(param.name)}=${encodeURIComponent(String(item))}`);
        }
      } else {
        cookies.push(`${encodeURIComponent(param.name)}=${encodeURIComponent(String(value))}`);
      }
    } else if (param.in === 'body') {
      body = value;
      if (param.contentType && !headers['Content-Type']) {
        headers['Content-Type'] = param.contentType;
      }
    }
  }

  if (!metadataPath) {
    applyODataSystemQueryOptions(query, parameterValues);
  }

  url = appendQueryAndCookies(url, query, cookies, headers);
  addAuthHeaders(headers, auth);

  const resp = await axios({
    method,
    url,
    headers,
    data: body,
  });

  return resp;
}
