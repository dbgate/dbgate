import { currentTheme } from '../stores';
import registerCommand from './registerCommand';

registerCommand({
  id: 'theme.changeTheme',
  text: 'Theme: Change',
  getSubCommands: () => [
    {
      text: 'Light',
      onClick: () => currentTheme.set('theme-light'),
    },
    {
        text: 'Dark',
        onClick: () => currentTheme.set('theme-dark'),
      },
    ],
});
