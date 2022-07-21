<script lang="ts">
  import { PerspectiveCache } from 'dbgate-datalib';

  import PerspectiveView from '../perspectives/PerspectiveView.svelte';
  import usePerspectiveConfig from '../utility/usePerspectiveConfig';
  import stableStringify from 'json-stable-stringify';
  import { writable } from 'svelte/store';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  const config = usePerspectiveConfig(tabid);
  const cache = new PerspectiveCache(stableStringify);
  const loadedCounts = writable({});
</script>

<PerspectiveView
  {conid}
  {database}
  {schemaName}
  {pureName}
  config={$config}
  setConfig={config.update}
  {cache}
  {loadedCounts}
/>
