<script lang="ts">
  import JslDataGrid from '../datagrid/JslDataGrid.svelte';

  export let resultInfos = [];
  export let driver = null;
  export let dbinfo = null;
  export let changeSetStates = {};
  export let changeSetDispatchers = {};
  export let queryResultEditing = false;
  export let onQueryResultInfoLoaded = null;
</script>

<div
  class="main"
  class:main1={resultInfos.length == 1}
  class:main2={resultInfos.length == 2}
  class:main3={resultInfos.length > 2}
>
  {#each resultInfos as info}
    <div class="wrapper">
      <JslDataGrid
        jslid={info.jslid}
        multipleGridsOnTab={resultInfos.length >= 2}
        {driver}
        {dbinfo}
        {queryResultEditing}
        changeSetState={queryResultEditing ? changeSetStates[info.jslid] : null}
        dispatchChangeSet={queryResultEditing ? changeSetDispatchers[info.jslid] : null}
        onQueryResultInfoLoaded={value => onQueryResultInfoLoaded?.(info.jslid, value)}
      />
    </div>
  {/each}
</div>

<style>
  .main1 .wrapper {
    position: relative;
    display: flex;
    width: 100%;
    height: 100%;
  }
  .main2 .wrapper {
    position: relative;
    display: flex;
    width: 100%;
    height: calc(50% - 2px);
    border-bottom: var(--theme-redis-border);
  }
  .main3 .wrapper {
    position: relative;
    display: flex;
    width: 100%;
    height: 40%;
    border-bottom: var(--theme-redis-border);
  }
  .main {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }
  .main3 {
    overflow-y: scroll;
  }
</style>
