import resolveApi, { resolveApiHeaders } from './resolveApi';
import { writable } from 'svelte/store';

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

import _ from 'lodash';

export function useApiCall(route, args, defaultValue) {
  const result = writable(defaultValue);

  apiCall(route, args).then(resp => {
    result.set(resp);
  });

  return result;
}
