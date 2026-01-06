<script lang="ts" context="module">
  export const extractKey = data => data.tabid;
</script>

<script lang="ts">
  import { openedTabs } from '../stores';
  import { setSelectedTabFunc } from '../utility/common';

  import AppObjectCore from './AppObjectCore.svelte';

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
/>

<style>
  .info {
    margin-left: 30px;
    color: var(--theme-font-3);
  }
</style>
