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

export async function executeRestApiEndpoint(
  definition: RestApiDefinition,
  endpoint: string,
  method: string,
  parameterValues: Record<string, any>,
  server: string,
  auth: RestApiAuthorization | null,
  axios: AxiosInstance
): Promise<any> {
  const endpointDef = definition.categories
    .flatMap(category => category.endpoints)
    .find(ep => ep.path === endpoint && ep.method === method);
  if (!endpointDef) {
    throw new Error(`Endpoint ${method} ${endpoint} not found in definition.`);
  }

  let url = server + endpointDef.path;
  const headers: Record<string, string> = {};
  const query = new URLSearchParams();
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

  const queryString = query.toString();
  if (queryString) {
    const separator = url.includes('?') ? '&' : '?';
    url += separator + queryString;
  }

  if (cookies.length > 0) {
    headers['Cookie'] = cookies.join('; ');
  }

  if (auth) {
    if (auth.type === 'basic') {
      const basicAuth = Buffer.from(`${auth.user}:${auth.password}`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    } else if (auth.type === 'bearer') {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth.type === 'apikey') {
      headers[auth.header] = auth.value;
    }
  }

  const resp = await axios({
    method,
    url,
    headers,
    data: body,
  });

  return resp;
}
