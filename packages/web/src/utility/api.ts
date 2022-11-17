import resolveApi, { resolveApiHeaders } from './resolveApi';
import { writable } from 'svelte/store';
// import { cacheClean } from './cache';
import getElectron from './getElectron';
// import socket from './socket';
import { showSnackbarError } from '../utility/snackbar';
import { redirectToLogin } from '../clientAuth';

let eventSource;
let apiLogging = false;
// let cacheCleanerRegistered;
// let apiDisabled = false;

// export function disableApi() {
//   apiDisabled = true;
// }

function wantEventSource() {
  if (!eventSource) {
    eventSource = new EventSource(`${resolveApi()}/stream`);
    // eventSource.addEventListener('clean-cache', e => cacheClean(JSON.parse(e.data)));
  }
}

function processApiResponse(route, args, resp) {
  // if (apiLogging) {
  //   console.log('<<< API RESPONSE', route, args, resp);
  // }

  if (resp?.apiErrorMessage) {
    showSnackbarError('API error:' + resp?.apiErrorMessage);
    return {
      errorMessage: resp.apiErrorMessage,
    };
  }

  return resp;
}

export async function apiCall(route: string, args: {} = undefined) {
  if (apiLogging) {
    console.log('>>> API CALL', route, args);
  }
  if (apiDisabled) {
    console.log('Error, API disabled!!');
    return null;
  }

  const electron = getElectron();
  if (electron) {
    const resp = await electron.invoke(route.replace('/', '-'), args);
    return processApiResponse(route, args, resp);
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

    if (resp.status == 401) {
      // unauthorized
      redirectToLogin();
    }

    const json = await resp.json();
    return processApiResponse(route, args, json);
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
