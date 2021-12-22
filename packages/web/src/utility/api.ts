import resolveApi, { resolveApiHeaders } from './resolveApi';

export async function apiCall(route: string, args: {} = undefined) {
  const resp = await fetch(`${resolveApi()}/${route}`, {
    method: 'POST',
    cache: 'no-cache',
    headers: {
      'Content-Type': 'application/json',
      ...resolveApiHeaders(),
    },
    body: JSON.stringify(args),
  });
  return resp.json();
}

export function apiOn(event: string, hander: Function) {}

export function apiOff(event: string, hander: Function) {}
