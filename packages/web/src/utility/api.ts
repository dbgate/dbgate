import resolveApi, { resolveApiHeaders } from './resolveApi';
import { writable } from 'svelte/store';
// import { cacheClean } from './cache';
import getElectron from './getElectron';
// import socket from './socket';

let eventSource;
let apiLogging = false;
// let cacheCleanerRegistered;

function wantEventSource() {
  if (!eventSource) {
    eventSource = new EventSource(`${resolveApi()}/stream`);
    // eventSource.addEventListener('clean-cache', e => cacheClean(JSON.parse(e.data)));
  }
}

export async function apiCall(route: string, args: {} = undefined) {
  if (apiLogging) {
    console.log('>>> API CALL', route, args);
  }

  const electron = getElectron();
  if (electron) {
    const resp = await electron.invoke(route.replace('/', '-'), args);

    if (apiLogging) {
      console.log('<<< API RESPONSE', route, args, resp);
    }

    return resp;
  } else {
    const resp = await fetch(`${resolveApi()}/${route}`, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
        ...resolveApiHeaders(),
      },
      body: JSON.stringify(args),
    });

    const json = await resp.json();

    if (apiLogging) {
      console.log('<<< API RESPONSE', route, args, json);
    }

    return json;
  }
}

const apiHandlers = new WeakMap();

export function apiOn(event: string, handler: Function) {
  const electron = getElectron();
  if (electron) {
    if (!apiHandlers.has(handler)) {
      const handlerProxy = (e, data) => {
        if (apiLogging) {
          console.log('@@@ API EVENT', event, data);
        }
        handler(data);
      };
      apiHandlers.set(handler, handlerProxy);
    }

    electron.addEventListener(event, apiHandlers.get(handler));
  } else {
    wantEventSource();
    if (!apiHandlers.has(handler)) {
      const handlerProxy = e => {
        const json = JSON.parse(e.data);
        if (apiLogging) {
          console.log('@@@ API EVENT', event, json);
        }

        handler(json);
      };
      apiHandlers.set(handler, handlerProxy);
    }

    eventSource.addEventListener(event, apiHandlers.get(handler));
  }

  // if (!cacheCleanerRegistered) {
  //   cacheCleanerRegistered = true;
  //   apiOn('clean-cache', reloadTrigger => cacheClean(reloadTrigger));
  // }
}

export function apiOff(event: string, handler: Function) {
  const electron = getElectron();
  if (apiHandlers.has(handler)) {
    if (electron) {
      electron.removeEventListener(event, apiHandlers.get(handler));
    } else {
      wantEventSource();
      eventSource.removeEventListener(event, apiHandlers.get(handler));
    }
  }
}

export function useApiCall(route, args, defaultValue) {
  const result = writable(defaultValue);

  apiCall(route, args).then(resp => {
    result.set(resp);
  });

  return result;
}

function enableApiLog() {
  apiLogging = true;
  console.log('API loggin enabled');
}
function disableApiLog() {
  apiLogging = false;
  console.log('API loggin disabled');
}

window['enableApiLog'] = enableApiLog;
window['disableApiLog'] = disableApiLog;
