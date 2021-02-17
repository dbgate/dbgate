import App from './App.svelte';
import changeTheme from './theme/changeTheme';
import light from './theme/light';

changeTheme(light);

const app = new App({
  target: document.body,
  props: {
    name: 'world',
  },
});

export default app;
