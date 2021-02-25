import { currentTheme } from '../stores';
import registerCommand from './registerCommand';
import { get } from 'svelte/store';

function themeCommand(text, css) {
  return {
    text: text,
    onClick: () => currentTheme.set(css),
    // onPreview: () => {
    //   const old = get(currentTheme);
    //   currentTheme.set(css);
    //   return ok => {
    //     if (!ok) currentTheme.set(old);
    //   };
    // },
  };
}

registerCommand({
  id: 'theme.changeTheme',
  text: 'Theme: Change',
  getSubCommands: () => [themeCommand('Light', 'theme-light'), themeCommand('Dark', 'theme-dark')],
});
