<script lang="ts" context="module">
  import DatabaseAppObject from './DatabaseAppObject.svelte';
  import DatabaseObjectAppObject from './DatabaseObjectAppObject.svelte';

  export const extractKey = data => {
    if (data.objectTypeField) {
      return `${data.objectTypeField}||${data.schemaName}||${data.pureName}`;
    }
    return data.connection._id;
  };
</script>

<script lang="ts">
  export let data;
</script>

{#if data.objectTypeField}
  <DatabaseObjectAppObject {...$$props} />
{:else}
  <DatabaseAppObject {...$$props} />
{/if}
