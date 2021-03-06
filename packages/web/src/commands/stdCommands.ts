import { currentTheme, extensions, visibleToolbar } from '../stores';
import registerCommand from './registerCommand';
import { derived, get } from 'svelte/store';
import { ThemeDefinition } from 'dbgate-types';
import ConnectionModal from '../modals/ConnectionModal.svelte';
import { showModal } from '../modals/modalTools';

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
  category: 'Theme',
  name: 'Change',
  getSubCommands: () => get(extensions).themes.map(themeCommand),
});

registerCommand({
  id: 'toolbar.show',
  category: 'Toolbar',
  name: 'Show',
  onClick: () => visibleToolbar.set(1),
  enabledStore: derived(visibleToolbar, $visibleToolbar => !$visibleToolbar),
});

registerCommand({
  id: 'toolbar.hide',
  category: 'Toolbar',
  name: 'Hide',
  onClick: () => visibleToolbar.set(0),
  enabledStore: derived(visibleToolbar, $visibleToolbar => $visibleToolbar),
});

registerCommand({
  id: 'new.connection',
  toolbar: true,
  icon: 'icon connection',
  toolbarName: 'Add connection',
  category: 'New',
  toolbarOrder: 1,
  name: 'Connection',
  onClick: () => showModal(ConnectionModal),
});
