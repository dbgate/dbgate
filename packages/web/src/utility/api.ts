import resolveApi, { resolveApiHeaders } from './resolveApi';
import { writable } from 'svelte/store';
import socket from './socket';

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

export function apiOn(event: string, handler: Function) {
  socket().on(event, handler);
}

export function apiOff(event: string, handler: Function) {
  socket().off(event, handler);
}

import _ from 'lodash';

export function useApiCall(route, args, defaultValue) {
  const result = writable(defaultValue);

  apiCall(route, args).then(resp => {
    result.set(resp);
  });

  return result;
}
