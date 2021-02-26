import { currentTheme, extensions } from '../stores';
import registerCommand from './registerCommand';
import { get } from 'svelte/store';
import { ThemeDefinition } from 'dbgate-types';

function themeCommand(theme: ThemeDefinition) {
  return {
    text: theme.themeName,
    onClick: () => currentTheme.set(theme.className),
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
  getSubCommands: () => get(extensions).themes.map(themeCommand),
});
