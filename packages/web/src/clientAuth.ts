import { ca } from 'date-fns/locale';
import { apiCall, enableApi, getAuthCategory } from './utility/api';
import { getConfig } from './utility/metadataLoaders';
import { isAdminPage } from './utility/pageDefs';

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

  if (isOauthCallback()) {
    const [_prefix, strmid, amoid] = sessionStorage.getItem('oauthState').split(':');

    sessionStorage.removeItem('oauthState');
    apiCall('auth/oauth-token', {
      code: sentCode,
      amoid,
      redirectUri: location.origin + location.pathname,
    }).then(authResp => {
      const { accessToken, error, errorMessage } = authResp;

      if (accessToken) {
        console.log('Settings access token from OAUTH');
        localStorage.setItem('accessToken', accessToken);
        internalRedirectTo('/');
      } else {
        console.log('Error when processing OAUTH callback', error || errorMessage);
        internalRedirectTo(`/?page=not-logged&error=${error || errorMessage}`);
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
      redirectUri: location.origin + location.pathname,
    }).then(authResp => {
      if (authResp.success) {
        window.close();
      } else if (authResp.error) {
        internalRedirectTo(`/?page=error&error=${encodeURIComponent(authResp.error)}`);
      } else {
        internalRedirectTo(`/?page=error`);
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
    }).then(authResp => {
      if (authResp.accessToken) {
        localStorage.setItem('accessToken', authResp.accessToken);
        internalRedirectTo('/');
      } else if (authResp.error) {
        internalRedirectTo(`/?page=error&error=${encodeURIComponent(authResp.error)}`);
      } else {
        internalRedirectTo(`/?page=error`);
      }
    });

    return true;
  }

  return false;
}

export async function handleAuthOnStartup(config, isAdminPage = false) {
  if (!config.isLicenseValid || config.configurationError) {
    internalRedirectTo(`/?page=error`);
    return;
  }

  if (getAuthCategory(config) == 'admin') {
    if (localStorage.getItem('adminAccessToken')) {
      return;
    }

    redirectToAdminLogin();
    return;
  }

  // if (config.oauth) {
  //   console.log('OAUTH callback URL:', location.origin + location.pathname);
  // }
  if (getAuthCategory(config) == 'token') {
    if (localStorage.getItem('accessToken')) {
      return;
    }

    redirectToLogin(config);
  }
}

export async function redirectToAdminLogin() {
  internalRedirectTo('/?page=admin-login');
  return;
}

export async function redirectToLogin(config = null, force = false) {
  if (!config) {
    enableApi();
    config = await getConfig();
  }

  if (getAuthCategory(config) == 'token') {
    if (!force) {
      const params = new URLSearchParams(location.search);
      if (params.get('page') == 'login' || params.get('page') == 'admin-login' || params.get('page') == 'not-logged') {
        return;
      }
    }
    internalRedirectTo('/?page=login');
    return;
  }

  if (config.oauth) {
    const state = `dbg-oauth:${Math.random().toString().substr(2)}`;
    const scopeParam = config.oauthScope ? `&scope=${config.oauthScope}` : '';
    sessionStorage.setItem('oauthState', state);
    console.log('Redirecting to OAUTH provider');
    location.replace(
      `${config.oauth}?client_id=${config.oauthClient}&response_type=code&redirect_uri=${encodeURIComponent(
        location.origin + location.pathname
      )}&state=${encodeURIComponent(state)}${scopeParam}`
    );
    return;
  }
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
    internalRedirectTo('/?page=admin-login&is-admin=true');
  } else if (category == 'token') {
    localStorage.removeItem('accessToken');
    if (config.logoutUrl) {
      window.location.href = config.logoutUrl;
    } else {
      internalRedirectTo('/?page=not-logged');
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
