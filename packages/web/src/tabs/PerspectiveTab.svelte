<script lang="ts">
  import { PerspectiveCache } from 'dbgate-datalib';

  import PerspectiveView from '../perspectives/PerspectiveView.svelte';
  import usePerspectiveConfig from '../utility/usePerspectiveConfig';
  import stableStringify from 'json-stable-stringify';

  export let tabid;
  export let conid;
  export let database;
  export let schemaName;
  export let pureName;

  const config = usePerspectiveConfig(tabid);
  const cache = new PerspectiveCache(stableStringify);
</script>

<PerspectiveView {conid} {database} {schemaName} {pureName} config={$config} setConfig={config.update} {cache} />
