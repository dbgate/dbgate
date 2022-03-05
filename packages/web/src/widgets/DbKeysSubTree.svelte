<script lang="ts">
  import { useDatabaseKeys } from '../utility/metadataLoaders';

  export let conid;
  export let database;

  export let root;

  $: keys = useDatabaseKeys({ conid, database, root });
</script>

{#each $keys || [] as key}
  <div>
    {key.text}
  </div>
{/each}
