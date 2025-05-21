<script lang="ts" context="module">
  import AppObjectCore from './AppObjectCore.svelte';

  export const extractKey = data => data.cntid;
  export const createMatcher =
    filter =>
    ({ name }) =>
      filterName(filter, name);
</script>

<script lang="ts">
  import { filterName } from 'dbgate-tools';

  export let data;

  function createMenu() {
    return [];
  }
</script>

<AppObjectCore {...$$restProps} {data} icon={'img connection'} title={data.name} menu={createMenu}></AppObjectCore>

<style>
  .info {
    margin-left: 30px;
    margin-right: 5px;
    color: var(--theme-font-3);
    white-space: nowrap;
  }
</style>
