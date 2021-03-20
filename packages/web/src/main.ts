import App from './App.svelte';
import './utility/connectionsPinger';
import './utility/changeCurrentDbByTab';
import './commands/stdCommands';
import localStorageGarbageCollector from './utility/localStorageGarbageCollector';

localStorageGarbageCollector();

const app = new App({
  target: document.body,
  props: {},
});

export default app;
