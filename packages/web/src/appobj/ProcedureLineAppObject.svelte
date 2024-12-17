<script lang="ts" context="module">
  export const extractKey = ({ columnName }) => columnName;

  export const createMatcher =
    (filter, cfg = DEFAULT_OBJECT_SEARCH_SETTINGS) =>
    data => {
      const filterArgs = [];
      if (cfg.sqlObjectText) filterArgs.push(data.lineData);

      const res = filterName(filter, ...filterArgs);
      return res;
    };
</script>

<script lang="ts">
  import AppObjectCore from './AppObjectCore.svelte';
  import { filterName } from 'dbgate-tools';
  import { DEFAULT_OBJECT_SEARCH_SETTINGS } from '../stores';

  export let data;
</script>

<AppObjectCore {...$$restProps} {data} icon="icon text" title={data.lineData?.substring(0, 100)} disableHover />
