import resolveApi, { resolveApiHeaders } from './resolveApi';
import { writable } from 'svelte/store';
// import { cacheClean } from './cache';
import getElectron from './getElectron';
// import socket from './socket';
import { showSnackbarError } from '../utility/snackbar';
import { isOauthCallback, redirectToLogin } from '../clientAuth';
import { showModal } from '../modals/modalTools';
import DatabaseLoginModal, { isDatabaseLoginVisible } from '../modals/DatabaseLoginModal.svelte';
import _ from 'lodash';
import uuidv1 from 'uuid/v1';

export const strmid = uuidv1();

let eventSource;
let apiLogging = false;
// let cacheCleanerRegistered;
let apiDisabled = false;
const disabledOnOauth = isOauthCallback();

const volatileConnectionMap = {};
const volatileConnectionMapInv = {};

export function disableApi() {
  apiDisabled = true;
}

export function enableApi() {
  apiDisabled = false;
}

export function setVolatileConnectionRemapping(existingConnectionId, volatileConnectionId) {
  volatileConnectionMap[existingConnectionId] = volatileConnectionId;
  volatileConnectionMapInv[volatileConnectionId] = existingConnectionId;
}

export function getVolatileRemapping(conid) {
  return volatileConnectionMap[conid] || conid;
}

export function getVolatileRemappingInv(conid) {
  return volatileConnectionMapInv[conid] || conid;
}

export function removeVolatileMapping(conid) {
  const mapped = volatileConnectionMap[conid];
  if (mapped) {
    delete volatileConnectionMap[conid];
    delete volatileConnectionMapInv[mapped];
  }
}

function wantEventSource() {
  if (!eventSource) {
    eventSource = new EventSource(`${resolveApi()}/stream?strmid=${strmid}`);
    // eventSource.addEventListener('clean-cache', e => cacheClean(JSON.parse(e.data)));
  }
}

function processApiResponse(route, args, resp) {
  // if (apiLogging) {
  //   console.log('<<< API RESPONSE', route, args, resp);
  // }

  if (resp?.missingCredentials) {
    if (!isDatabaseLoginVisible()) {
      showModal(DatabaseLoginModal, resp.detail);
    }
    return null;
    // return {
    //   errorMessage: resp.apiErrorMessage,
    //   missingCredentials: true,
    // };
  } else if (resp?.apiErrorMessage) {
    showSnackbarError('API error:' + resp?.apiErrorMessage);
    return {
      errorMessage: resp.apiErrorMessage,
    };
  }

  return resp;
}

export function transformApiArgs(args) {
  return _.mapValues(args, (v, k) => {
    if (k == 'conid' && v && volatileConnectionMap[v]) return volatileConnectionMap[v];
    if (k == 'conidArray' && _.isArray(v)) return v.map(x => volatileConnectionMap[x] || x);
    return v;
  });
}

export function transformApiArgsInv(args) {
  return _.mapValues(args, (v, k) => {
    if (k == 'conid' && v && volatileConnectionMapInv[v]) return volatileConnectionMapInv[v];
    if (k == 'conidArray' && _.isArray(v)) return v.map(x => volatileConnectionMapInv[x] || x);
    return v;
  });
}

export async function apiCall(route: string, args: {} = undefined) {
  if (apiLogging) {
    console.log('>>> API CALL', route, args);
  }
  if (apiDisabled) {
    console.log('API disabled!!', route);
    return;
  }
  if (disabledOnOauth && route != 'auth/oauth-token') {
    console.log('API disabled because oauth callback!!', route);
    return;
  }

  args = transformApiArgs(args);

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

    if (resp.status == 401 && !apiDisabled) {
      const params = new URLSearchParams(location.search);

      disableApi();
      console.log('Disabling API', route);
      if (params.get('page') != 'login' && params.get('page') != 'not-logged') {
        // unauthorized
        redirectToLogin();
      }
      return;
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
