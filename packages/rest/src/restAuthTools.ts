import { RestApiAuthorization } from './restApiDef';

export function buildRestAuthHeaders(auth: RestApiAuthorization | null) {
  const headers = {};
  if (!auth) return headers;
  if (auth.type === 'basic') {
    const basicAuth = Buffer.from(`${auth.user}:${auth.password}`).toString('base64');
    headers['Authorization'] = `Basic ${basicAuth}`;
  } else if (auth.type === 'bearer') {
    headers['Authorization'] = `Bearer ${auth.token}`;
  } else if (auth.type === 'apikey') {
    headers[auth.header] = auth.value;
  }
  return headers;
}
