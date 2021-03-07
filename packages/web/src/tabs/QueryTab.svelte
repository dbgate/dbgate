<script lang="ts">
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import { useConnectionInfo } from '../utility/metadataLoaders';

  export let tabid;
  export let conid;
  export let database;

  // $: connection = useConnectionInfo({ conid });
  // engine={$connection && $connection.engine} 
</script>

<VerticalSplitter>
  <svelte:fragment slot="1">
    <SqlEditor />
  </svelte:fragment>
</VerticalSplitter>
