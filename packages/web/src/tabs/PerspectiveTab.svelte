<script lang="ts">
  import PerspectiveView from '../perspectives/PerspectiveView.svelte';
  import usePerspectiveConfig, { usePerspectiveCache } from '../utility/usePerspectiveConfig';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  const config = usePerspectiveConfig(tabid);
  const cache = usePerspectiveCache();
</script>

<PerspectiveView
  {conid}
  {database}
  {schemaName}
  {pureName}
  config={$config}
  setConfig={config.update}
  {cache}
  setCache={cache.update}
/>
