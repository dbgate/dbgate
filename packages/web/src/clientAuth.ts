import { apiCall, enableApi, getAuthCategory } from './utility/api';
import { getConfig } from './utility/metadataLoaders';
import { isAdminPage } from './utility/pageDefs';
import getElectron from './utility/getElectron';
import { isProApp } from './utility/proTools';

export function isOauthCallback() {
  const params = new URLSearchParams(location.search);
  const sentCode = params.get('code');
  const sentState = params.get('state');

  return (
    sentCode && sentState && sentState.startsWith('dbg-oauth:') && sentState == sessionStorage.getItem('oauthState')
  );
}

export function isDbLoginCallback() {
  const params = new URLSearchParams(location.search);
  const sentCode = params.get('code');
  const sentState = params.get('state');

  return (
    sentCode && sentState && sentState.startsWith('dbg-dblogin:') && sentState == localStorage.getItem('dbloginState')
  );
}

export function isDbLoginAuthCallback() {
  const params = new URLSearchParams(location.search);
  const sentCode = params.get('code');
  const sentState = params.get('state');

  return (
    sentCode &&
    sentState &&
    sentState.startsWith('dbg-dblogin:') &&
    sentState == sessionStorage.getItem('dbloginAuthState')
  );
}

export function handleOauthCallback() {
  const params = new URLSearchParams(location.search);
  const sentCode = params.get('code');
  const sid = params.get('sid');

  if (isOauthCallback()) {
    const [_prefix, strmid, amoid] = sessionStorage.getItem('oauthState').split(':');

    sessionStorage.removeItem('oauthState');
    apiCall('auth/oauth-token', {
      code: sentCode,
      amoid,
      redirectUri: location.origin + location.pathname,
      sid,
    }).then(authResp => {
      const { accessToken, error, errorMessage } = authResp;

      if (accessToken) {
        console.log('Settings access token from OAUTH');
        localStorage.setItem('accessToken', accessToken);
        internalRedirectTo('/');
      } else {
        console.log('Error when processing OAUTH callback', error || errorMessage);
        internalRedirectTo(`/not-logged.html?error=${error || errorMessage}`);
      }
    });

    return true;
  }

  if (isDbLoginCallback()) {
    const [_prefix, strmid, conid] = localStorage.getItem('dbloginState').split(':');
    localStorage.removeItem('dbloginState');

    apiCall('connections/dblogin-token', {
      code: sentCode,
      conid,
      strmid,
      sid,
      redirectUri: location.origin + location.pathname,
    }).then(authResp => {
      if (authResp.success) {
        window.close();
      } else if (authResp.error) {
        internalRedirectTo(`/error.html?error=${encodeURIComponent(authResp.error)}`);
      } else {
        internalRedirectTo(`/error.html`);
      }
    });

    return true;
  }

  if (isDbLoginAuthCallback()) {
    const [_prefix, strmid, conid, amoid] = sessionStorage.getItem('dbloginAuthState').split(':');
    sessionStorage.removeItem('dbloginAuthState');

    apiCall('connections/dblogin-auth-token', {
      code: sentCode,
      conid,
      redirectUri: location.origin + location.pathname,
      amoid,
      sid,
    }).then(authResp => {
      if (authResp.accessToken) {
        localStorage.setItem('accessToken', authResp.accessToken);
        internalRedirectTo('/');
      } else if (authResp.error) {
        internalRedirectTo(`/error.html?error=${encodeURIComponent(authResp.error)}`);
      } else {
        internalRedirectTo(`/error.html`);
      }
    });

    return true;
  }

  return false;
}

export async function handleAuthOnStartup(config) {
  const page = window['dbgate_page'];

  function checkConfigError() {
    if (config.configurationError) {
      internalRedirectTo(`/error.html`);
      return true;
    }
  }

  function checkInvalidLicense() {
    if (!isProApp()) {
      return;
    }
    if (!config.isLicenseValid) {
      if (config.storageDatabase || getElectron()) {
        if (isAdminPage()) {
          internalRedirectTo(`/admin-license.html`);
        } else {
          internalRedirectTo(`/license.html`);
        }
      } else {
        internalRedirectTo(`/error.html`);
      }
      return true;
    }
  }

  function checkTrialDaysLeft() {
    if (!isProApp()) {
      return;
    }
    if (
      config.trialDaysLeft != null &&
      config.trialDaysLeft <= 14 &&
      !sessionStorage.getItem('continueTrialConfirmed') &&
      getElectron()
    ) {
      internalRedirectTo(`/license.html`);
      return true;
    }
  }

  function checkLoggedUser() {
    if (getAuthCategory(config) == 'admin') {
      if (!config.isInvalidToken && localStorage.getItem('adminAccessToken')) {
        return false;
      }

      redirectToAdminLogin();
      return true;
    }

    if (getAuthCategory(config) == 'token') {
      if (!config.isInvalidToken && localStorage.getItem('accessToken')) {
        return false;
      }

      redirectToLogin(config);
      return true;
    }
  }

  function checkAdminPasswordSet() {
    if (config.isAdminPasswordMissing) {
      internalRedirectTo(`/set-admin-password.html`);
      return true;
    }
  }

  if (page == 'error') return;
  if (checkConfigError()) return;

  if (page == 'set-admin-password') return;
  if (checkAdminPasswordSet()) return;

  if (page == 'login' || page == 'admin-login' || page == 'not-logged') return;
  if (checkLoggedUser()) return;

  if (page == 'license' || page == 'admin-license') return;
  if (checkTrialDaysLeft()) return;
  if (checkInvalidLicense()) return;

  // if (config.configurationError) {
  //   internalRedirectTo(`/error.html`);
  //   return;
  // }

  // if (!config.isLicenseValid) {
  //   if (config.storageDatabase || getElectron()) {
  //     internalRedirectTo(`/license.html`);
  //   } else {
  //     internalRedirectTo(`/error.html`);
  //   }
  // }

  // if (
  //   config.trialDaysLeft != null &&
  //   config.trialDaysLeft <= 14 &&
  //   !sessionStorage.getItem('continueTrialConfirmed') &&
  //   getElectron()
  // ) {
  //   internalRedirectTo(`/license.html`);
  // }

  // if (getAuthCategory(config) == 'admin') {
  //   if (localStorage.getItem('adminAccessToken')) {
  //     return;
  //   }

  //   redirectToAdminLogin();
  //   return;
  // }

  // // if (config.oauth) {
  // //   console.log('OAUTH callback URL:', location.origin + location.pathname);
  // // }
  // if (getAuthCategory(config) == 'token') {
  //   if (localStorage.getItem('accessToken')) {
  //     return;
  //   }

  //   redirectToLogin(config);
  // }
}

export async function redirectToAdminLogin() {
  internalRedirectTo('/admin-login.html');
  return;
}

export async function redirectToLogin(config = null, force = false) {
  if (!config) {
    enableApi();
    config = await getConfig();
  }

  if (getAuthCategory(config) == 'token') {
    if (!force) {
      const page = window['dbgate_page'];
      if (page == 'login' || page == 'admin-login' || page == 'not-logged') {
        return;
      }
    }
    internalRedirectTo('/login.html');
    return;
  }

  // if (config.oauth) {
  //   const state = `dbg-oauth:${Math.random().toString().substr(2)}`;
  //   const scopeParam = config.oauthScope ? `&scope=${config.oauthScope}` : '';
  //   sessionStorage.setItem('oauthState', state);
  //   console.log('Redirecting to OAUTH provider');
  //   location.replace(
  //     `${config.oauth}?client_id=${config.oauthClient}&response_type=code&redirect_uri=${encodeURIComponent(
  //       location.origin + location.pathname
  //     )}&state=${encodeURIComponent(state)}${scopeParam}`
  //   );
  //   return;
  // }
}

export function internalRedirectTo(path) {
  const index = location.pathname.lastIndexOf('/');
  const newPath = index >= 0 ? location.pathname.substring(0, index) + path : path;
  location.replace(newPath);
}

export async function doLogout() {
  enableApi();
  const config = await getConfig();
  const category = getAuthCategory(config);

  if (category == 'admin') {
    localStorage.removeItem('adminAccessToken');
    internalRedirectTo('/admin-login.html?is-admin=true');
  } else if (category == 'token') {
    localStorage.removeItem('accessToken');
    if (config.logoutUrl) {
      window.location.href = config.logoutUrl;
    } else {
      internalRedirectTo('/not-logged.html');
    }
  } else if (category == 'basic') {
    window.location.href = 'config/logout';
  }

  // if (config.oauth) {
  //   localStorage.removeItem(isAdminPage() ? 'adminAccessToken' : 'accessToken');
  //   if (config.oauthLogout) {
  //     window.location.href = config.oauthLogout;
  //   } else {
  //     internalRedirectTo('/?page=not-logged');
  //   }
  // } else if (config.isLoginForm) {
  //   localStorage.removeItem(isAdminPage() ? 'adminAccessToken' : 'accessToken');
  //   internalRedirectTo(`/?page=not-logged&is-admin=${isAdminPage() ? 'true' : ''}`);
  // } else if (config.isAdminLoginForm && isAdminPage()) {
  //   localStorage.removeItem('adminAccessToken');
  //   internalRedirectTo('/?page=admin-login&is-admin=true');
  // } else {
  //   window.location.href = 'config/logout';
  // }
}
