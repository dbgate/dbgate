import { apiCall, enableApi } from './utility/api';
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

export function handleOauthCallback() {
  const params = new URLSearchParams(location.search);
  const sentCode = params.get('code');

  if (isOauthCallback()) {
    sessionStorage.removeItem('oauthState');
    apiCall('auth/oauth-token', {
      code: sentCode,
      redirectUri: location.origin + location.pathname,
    }).then(authResp => {
      const { accessToken, error, errorMessage } = authResp;

      if (accessToken) {
        console.log('Settings access token from OAUTH');
        localStorage.setItem('accessToken', accessToken);
        internalRedirectTo('/');
      } else {
        console.log('Error when processing OAUTH callback', error || errorMessage);
        internalRedirectTo(`?page=not-logged&error=${error || errorMessage}`);
      }
    });

    return true;
  }

  console.log('****************** IS DB LOGIN TEST');
  if (isDbLoginCallback()) {
    console.log('****************** IS DB LOGIN TRUE');
    const conid = localStorage.getItem('dbloginState').split('@')[1];
    localStorage.removeItem('dbloginState');

    apiCall('connections/dblogin-token', {
      code: sentCode,
      conid,
      redirectUri: location.origin + location.pathname,
    }).then(authResp => {
      const { accessToken, error, errorMessage } = authResp;

      if (accessToken) {
        console.log('Settings access token from OAUTH');
        localStorage.setItem('accessToken', accessToken);
        internalRedirectTo('/');
      } else {
        console.log('Error when processing OAUTH callback', error || errorMessage);
        internalRedirectTo(`?page=not-logged&error=${error || errorMessage}`);
      }
    });

    return true;
  }

  return false;
}

export async function handleAuthOnStartup(config, isAdminPage = false) {
  if (!config.isLicenseValid) {
    internalRedirectTo(`?page=error`);
    return;
  }

  if (config.isAdminLoginForm && isAdminPage) {
    if (localStorage.getItem('adminAccessToken')) {
      return;
    }

    redirectToAdminLogin();
    return;
  }

  if (config.oauth) {
    console.log('OAUTH callback URL:', location.origin + location.pathname);
  }
  if (config.oauth || config.isLoginForm) {
    if (localStorage.getItem('accessToken')) {
      return;
    }

    redirectToLogin(config);
  }
}

export async function redirectToAdminLogin() {
  internalRedirectTo('?page=admin-login');
  return;
}

export async function redirectToLogin(config = null, force = false) {
  if (!config) {
    enableApi();
    config = await getConfig();
  }

  if (config.isLoginForm) {
    if (!force) {
      const params = new URLSearchParams(location.search);
      if (params.get('page') == 'login' || params.get('page') == 'admin-login' || params.get('page') == 'not-logged') {
        return;
      }
    }
    internalRedirectTo('?page=login');
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
  if (config.oauth) {
    localStorage.removeItem(isAdminPage() ? 'adminAccessToken' : 'accessToken');
    if (config.oauthLogout) {
      window.location.href = config.oauthLogout;
    } else {
      internalRedirectTo('?page=not-logged');
    }
  } else if (config.isLoginForm) {
    localStorage.removeItem(isAdminPage() ? 'adminAccessToken' : 'accessToken');
    internalRedirectTo(`?page=not-logged&is-admin=${isAdminPage() ? 'true' : ''}`);
  } else if (config.isAdminLoginForm && isAdminPage()) {
    localStorage.removeItem('adminAccessToken');
    internalRedirectTo('?page=admin-login&is-admin=true');
  } else {
    window.location.href = 'config/logout';
  }
}
