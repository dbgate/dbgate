<script lang="ts" context="module">
  import { filterName } from 'dbgate-tools';

  export const extractKey = data => data.tabid;

  export const createMatcher =
    filter =>
    ({ title }) =>
      filterName(filter, title);
</script>

<script lang="ts">
  import { openedTabs } from '../stores';
  import { setSelectedTabFunc } from '../utility/common';
  import tabs from '../tabs';
  import uuidv1 from 'uuid/v1';

  import AppObjectCore from './AppObjectCore.svelte';
  import { apiCall } from '../utility/api';

  export let data;

  const handleClose = () => {
    openedTabs.update(tabs => tabs.map(x => (x.tabid == data.tabid ? { ...x, closedTime: new Date().getTime() } : x)));
  };

  function createMenu() {
    return [{ text: 'Close', onClick: handleClose }];
  }

  const onClick = () => {
    openedTabs.update(files => setSelectedTabFunc(files, data.tabid));
  };

  function handlePin() {
    apiCall('files/save', {
      folder: 'favorites',
      file: uuidv1(),
      format: 'json',
      data,
    });
  }

  $: tabComponent = data.tabComponent;
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.title}
  icon={data.icon}
  isBold={!!data.selected}
  on:click={onClick}
  isBusy={data.busy}
  menu={createMenu}
  onPin={tabComponent &&
    tabs[tabComponent] &&
    tabs[tabComponent].allowAddToFavorites &&
    tabs[tabComponent].allowAddToFavorites(data) &&
    handlePin}
  on:middleclick={handleClose}
/>

<style>
  .info {
    margin-left: 30px;
    color: var(--theme-font-3);
  }
</style>
