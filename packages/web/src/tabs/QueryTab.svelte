<script lang="ts">
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import { useConnectionInfo } from '../utility/metadataLoaders';

  export let tabid;
  export let conid;
  export let database;

  $: connection = useConnectionInfo({ conid });
</script>

<VerticalSplitter>
  <svelte:fragment slot="1">
    <SqlEditor engine={$connection && $connection.engine} />
  </svelte:fragment>
</VerticalSplitter>
