import App from './App.svelte';
import './utility/connectionsPinger';

const app = new App({
  target: document.body,
  props: {
    name: 'world',
  },
});

export default app;
