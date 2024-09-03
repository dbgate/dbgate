<script lang="ts">
  import _ from 'lodash';
  import mainMenuDefinition from '../../../../app/src/mainMenuDefinition';
  import FontIcon from '../icons/FontIcon.svelte';
  import HorizontalMenu from '../modals/HorizontalMenu.svelte';

  import { activeTab, currentDatabase } from '../stores';
  import { isMac } from '../utility/common';
  import getElectron from '../utility/getElectron';
  import { apiOn } from '../utility/api';
  import { isProApp } from '../utility/proTools';

  $: title = _.compact([$activeTab?.title, $currentDatabase?.name, isProApp() ? 'DbGate Premium' : 'DbGate']).join(
    ' - '
  );
  const electron = getElectron();

  let isMaximized = false;

  if (electron) {
    apiOn('setIsMaximized', (maximized: boolean) => {
      isMaximized = maximized;
    });
  }
</script>

<div class="container" on:dblclick|stopPropagation|preventDefault={() => electron.send('window-action', 'maximize')}>
  {#if !isMac()}
    <div class="icon"><img src="logo192.png" width="20" height="20" /></div>
    <div class="menu">
      <HorizontalMenu items={mainMenuDefinition({ editMenu: !!electron })} />
    </div>
  {/if}
  <div class="title">{title}</div>

  {#if !isMac()}
    <div class="actions">
      <div class="button" on:click={() => electron.send('window-action', 'minimize')}>
        <FontIcon icon="icon window-minimize" />
      </div>
      <div class="button">
        <FontIcon
          icon={`icon ${isMaximized ? 'window-restore' : 'window-maximize'}`}
          on:click={() => electron.send('window-action', 'maximize')}
        />
      </div>
      <div class="button close-button" on:click={() => electron.send('window-action', 'close')}>
        <FontIcon icon="icon window-close" />
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    -webkit-app-region: drag;
    user-select: none;
    height: var(--dim-titlebar-height);
    display: flex;
    align-items: center;
    background: var(--theme-bg-2);
    color: var(--theme-font-1);
  }

  .title {
    flex-grow: 1;
    text-align: center;
    /* font-weight: bold; */
  }

  .icon {
    padding: 5px;
  }

  .button {
    padding: 5px 10px;
    font-size: 14pt;
  }

  .button:hover {
    background: var(--theme-bg-hover);
  }

  .close-button:hover {
    background: var(--theme-icon-red);
  }

  .menu {
    margin-left: 10px;
    -webkit-app-region: no-drag;
  }

  .actions {
    display: flex;
    margin-left: 0;
    -webkit-app-region: no-drag;
  }
</style>
