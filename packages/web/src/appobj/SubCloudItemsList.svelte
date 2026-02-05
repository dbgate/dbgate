<script lang="ts">
  import { cloudConnectionsStore } from '../stores';
  import SubDatabaseList from './SubDatabaseList.svelte';

  export let data;

  import { getLocalStorage } from '../utility/storageCache';
</script>

{#if data.conid && $cloudConnectionsStore[data.conid]}
  <SubDatabaseList {...$$props} data={$cloudConnectionsStore[data.conid]} />
{:else if data.conid && getLocalStorage(`database_list_${data.conid}`)}
  <SubDatabaseList {...$$props} data={{ _id: data.conid }} />
{/if}
