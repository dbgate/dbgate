import { apiCall, disableApi } from './utility/api';
import { getConfig } from './utility/metadataLoaders';

export function isOauthCallback() {
  const params = new URLSearchParams(location.search);
  const sentCode = params.get('code');
  const sentState = params.get('state');

  return (
    sentCode && sentState && sentState.startsWith('dbg-oauth:') && sentState == sessionStorage.getItem('oauthState')
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
      const { accessToken } = authResp;
      localStorage.setItem('accessToken', accessToken);
      location.replace('/');
    });

    return true;
  }

  return false;
}

export async function handleAuthOnStartup(config) {
  if (config.oauth) {
    if (localStorage.getItem('accessToken')) {
      return;
    }

    redirectToLogin(config);
  }
}

export async function redirectToLogin(config = null) {
  if (!config) config = await getConfig();

  const state = `dbg-oauth:${Math.random().toString().substr(2)}`;
  sessionStorage.setItem('oauthState', state);
  console.log('Redirecting to OAUTH provider');
  location.replace(
    `${config.oauth}?client_id=dbgate&response_type=code&redirect_uri=${encodeURIComponent(
      location.origin + location.pathname
    )}&state=${encodeURIComponent(state)}`
  );
}
