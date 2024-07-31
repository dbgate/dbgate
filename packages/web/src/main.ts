import App from './App.svelte';
import './utility/connectionsPinger';
import './utility/changeCurrentDbByTab';
import './commands/stdCommands';
import localStorageGarbageCollector from './utility/localStorageGarbageCollector';
import { handleOauthCallback } from './clientAuth';
import LoginPage from './LoginPage.svelte';
import NotLoggedPage from './NotLoggedPage.svelte';
import ErrorPage from './ErrorPage.svelte';

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
        props: {
          isAdminPage: false,
        },
      });
    case 'error':
      return new ErrorPage({
        target: document.body,
        props: {},
      });
    case 'admin-login':
      return new LoginPage({
        target: document.body,
        props: {
          isAdminPage: true,
        },
      });
    case 'not-logged':
      return new NotLoggedPage({
        target: document.body,
        props: {},
      });
    case 'admin':
      return new App({
        target: document.body,
        props: {
          isAdminPage: true,
        },
      });
  }

  return new App({
    target: document.body,
    props: {},
  });
}

const app = createApp();

export default app;
