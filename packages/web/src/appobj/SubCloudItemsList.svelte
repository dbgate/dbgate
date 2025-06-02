<script lang="ts">
  import { cloudConnectionsStore } from '../stores';
  import SubDatabaseList from './SubDatabaseList.svelte';

  export let data;
</script>

{#if data.conid && $cloudConnectionsStore[data.conid]}
  <SubDatabaseList {...$$props} data={$cloudConnectionsStore[data.conid]} />
{/if}
