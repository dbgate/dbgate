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

function urlOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function isSameUrlOrigin(url: string, otherUrl: string) {
  const origin = urlOrigin(url);
  return !!origin && origin === urlOrigin(otherUrl);
}

export function getRestAuthHeaderNames(auth: RestApiAuthorization | null): string[] {
  if (!auth) return [];
  if (auth.type === 'basic' || auth.type === 'bearer') return ['Authorization'];
  if (auth.type === 'apikey' && auth.header) return [auth.header];
  return [];
}

/**
 * The credentials of a connection must reach only the API it is configured for. When a response
 * redirects elsewhere, follow-redirects (used by axios in Node) drops Authorization and Cookie,
 * but forwards any other header - an API key header among them. Returns an axios beforeRedirect
 * option that removes the auth headers whenever a redirect leaves the origin of the request.
 */
export function createAuthRedirectGuard(url: string, auth: RestApiAuthorization | null) {
  return createHeaderRedirectGuard(url, getRestAuthHeaderNames(auth));
}

/**
 * Like createAuthRedirectGuard, for a caller that has the auth headers rather than the auth
 * definition - the given header names are removed when a redirect leaves the origin of url.
 */
export function createHeaderRedirectGuard(url: string, names: string[]) {
  const headerNames = names.map(name => name.toLowerCase());
  if (headerNames.length == 0) return undefined;
  return (options: { href?: string; headers?: Record<string, any> }) => {
    if (isSameUrlOrigin(options.href, url) || !options.headers) return;
    for (const key of Object.keys(options.headers)) {
      if (headerNames.includes(key.toLowerCase())) {
        delete options.headers[key];
      }
    }
  };
}
