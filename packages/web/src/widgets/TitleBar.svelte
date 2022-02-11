<script lang="ts">
  import _ from 'lodash';
  import FontIcon from '../icons/FontIcon.svelte';

  import { activeTab, currentDatabase } from '../stores';
  import getElectron from '../utility/getElectron';

  $: title = _.compact([$activeTab?.title, $currentDatabase?.name, 'DbGate']).join(' - ');
  const electron = getElectron();
</script>

<div class="container">
  <div class="icon"><FontIcon icon="img dbgate" /></div>
  <div class="menu">File Edit Window</div>
  <div class="title">{title}</div>

  <div class="actions">
    <div class="button" on:click={() => electron.send('window-action', 'minimize')}>
      <FontIcon icon="icon window-minimize" />
    </div>
    <div class="button">
      <FontIcon icon="icon window-restore" on:click={() => electron.send('window-action', 'maximize')} />
    </div>
    <div class="button close-button" on:click={() => electron.send('window-action', 'close')}>
      <FontIcon icon="icon window-close" />
    </div>
  </div>
</div>

<style>
  .container {
    -webkit-app-region: drag;
    user-select: none;
    height: var(--dim-titlebar-height);
    display: flex;
    align-items: center;
    background: var(--theme-bg-3);
    color: var(--theme-font-1);
  }

  .title {
    flex-grow: 1;
    text-align: center;
  }

  .icon {
    padding: 5px;
    font-size: 12pt;
  }

  .button {
    padding: 5px;
  }

  .close-button {
    padding: 5px 7px;
  }

  .button:hover {
    background: var(--theme-bg-hover);
  }

  .close-button:hover {
    background: var(--theme-icon-red);
  }

  .menu {
    margin-left: 10px;
  }

  .actions {
    display: flex;
    margin-left: 0;
    -webkit-app-region: no-drag;
  }
</style>
