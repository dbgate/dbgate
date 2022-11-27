import App from './App.svelte';
import './utility/connectionsPinger';
import './utility/changeCurrentDbByTab';
import './commands/stdCommands';
import localStorageGarbageCollector from './utility/localStorageGarbageCollector';
import { handleOauthCallback } from './clientAuth';
import LoginPage from './LoginPage.svelte';
import NotLoggedPage from './NotLoggedPage.svelte';

const isOauthCallback = handleOauthCallback();

const params = new URLSearchParams(location.search);
const page = params.get('page');

localStorageGarbageCollector();

function createApp() {
  if (isOauthCallback) {
    return null;
  }

  switch (page) {
    case 'login':
      return new LoginPage({
        target: document.body,
        props: {},
      });
    case 'not-logged':
      return new NotLoggedPage({
        target: document.body,
        props: {},
      });
  }

  return new App({
    target: document.body,
    props: {},
  });
}

const app = createApp();

export default app;
