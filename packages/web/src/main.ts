import App from './App.svelte';
import './utility/connectionsPinger';
import './utility/changeCurrentDbByTab';
import './commands/stdCommands';
import localStorageGarbageCollector from './utility/localStorageGarbageCollector';

const params = new URLSearchParams(location.search);
console.log('CODE', params.get('code'));
// console.log(
//   `http://auth.metrostav.vychozi.cz/auth/realms/metrostav/protocol/openid-connect/auth?client_id=dbgate&response_type=code&redirect_uri=${encodeURIComponent(
//     'http://localhost:5001/oauth-redirect'
//   )}&state=1234`
// );

console.log(location);

// location.replace(
//   `http://auth.metrostav.vychozi.cz/auth/realms/metrostav/protocol/openid-connect/auth?client_id=dbgate&response_type=code&redirect_uri=${encodeURIComponent(
//     'http://localhost:5001/'
//   )}&state=1234`
// );

localStorageGarbageCollector();

const app = new App({
  target: document.body,
  props: {},
});

// const app = null;

export default app;
