import App from './App.svelte';
import './utility/connectionsPinger';
import './utility/changeCurrentDbByTab';
import './commands/stdCommands';

const app = new App({
  target: document.body,
  props: {},
});

export default app;
