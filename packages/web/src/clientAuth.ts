import { apiCall } from './utility/api';
import { getConfig } from './utility/metadataLoaders';

export function handleOauthCallback() {
  const params = new URLSearchParams(location.search);
  const sentCode = params.get('code');
  const sentState = params.get('state');

  if (
    sentCode &&
    sentState &&
    sentState.startsWith('dbg-oauth:') &&
    sentState == sessionStorage.getItem('oauthState')
  ) {
    sessionStorage.removeItem('oauthState');
    apiCall('auth/oauth-token', {
      code: sentCode,
      redirectUri: location.origin,
    }).then(authResp => {
      const { accessToken } = authResp;
      console.log('Got new access token:', accessToken);
      localStorage.setItem('accessToken', accessToken);
      location.replace('/');
    });

    console.log('handleOauthCallback TRUE');
    return true;
  }

  console.log('handleOauthCallback FALSE');
  return false;
}

export async function handleAuthOnStartup(config) {
  console.log('********************* handleAuthOnStartup');
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
      location.origin
    )}&state=${encodeURIComponent(state)}`
  );
}
