<script lang="ts" context="module">
  export const extractKey = data => data.tabid;
</script>

<script lang="ts">
  import FontIcon from '../icons/FontIcon.svelte';
  import { openedTabs } from '../stores';
  import { setSelectedTabFunc } from '../utility/common';
  import moment from 'moment';

  import AppObjectCore from './AppObjectCore.svelte';

  export let data;

  const handleDelete = () => {
    openedTabs.update(tabs => tabs.filter(x => x.tabid != data.tabid));
  };
  const handleDeleteOlder = () => {
    openedTabs.update(tabs => tabs.filter(x => !x.closedTime || x.closedTime >= data.closedTime));
  };

  const onClick = () => {
    openedTabs.update(files =>
      setSelectedTabFunc(
        files.map(x => ({
          ...x,
          closedTime: x.tabid == data.tabid ? undefined : x.closedTime,
        })),
        data.tabid
      )
    );
  };

  function createMenu() {
    return [
      { text: 'Delete', onClick: handleDelete },
      { text: 'Delete older', onClick: handleDeleteOlder },
    ];
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={`${data.title} ${moment(data.closedTime).fromNow()}`}
  icon={data.icon}
  isBold={!!data.selected}
  on:click={onClick}
  isBusy={data.busy}
  menu={createMenu}
>
  {#if data.props && data.props.database}
    <div class="info">
      <FontIcon icon="icon database" />
      {data.props.database}
    </div>
  {/if}
  {#if data.contentPreview}
    <div class="info">
      {data.contentPreview}
    </div>
  {/if}
</AppObjectCore>

<style>
  .info {
    margin-left: 30px;
    color: var(--theme-font-3);
  }
</style>
