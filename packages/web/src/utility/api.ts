import resolveApi, { resolveApiHeaders } from './resolveApi';
import { writable } from 'svelte/store';
import { cacheClean } from './cache';
// import socket from './socket';

let eventSource;

function wantEventSource() {
  if (!eventSource) {
    eventSource = new EventSource(`${resolveApi()}/stream`);
    eventSource.addEventListener('clean-cache', e => cacheClean(JSON.parse(e.data)));
  }
}

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

const apiHandlers = new WeakMap();

export function apiOn(event: string, handler: Function) {
  wantEventSource();
  if (!apiHandlers.has(handler)) {
    const handlerProxy = e => {
      // console.log('RECEIVED', e.type, JSON.parse(e.data));
      handler(JSON.parse(e.data));
    };
    apiHandlers.set(handler, handlerProxy);
  }

  eventSource.addEventListener(event, apiHandlers.get(handler));
}

export function apiOff(event: string, handler: Function) {
  wantEventSource();
  if (apiHandlers.has(handler)) {
    eventSource.removeEventListener(event, apiHandlers.get(handler));
  }
}

export function useApiCall(route, args, defaultValue) {
  const result = writable(defaultValue);

  apiCall(route, args).then(resp => {
    result.set(resp);
  });

  return result;
}
