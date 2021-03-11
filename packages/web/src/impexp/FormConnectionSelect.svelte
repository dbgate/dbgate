<script lang="ts">
import FormSelectField from '../forms/FormSelectField.svelte';

  import { useConnectionList } from '../utility/metadataLoaders';

  $: connections = useConnectionList();
  $: connectionOptions = ($connections || []).map(conn => ({
    value: conn._id,
    label: conn.displayName || conn.server,
  }));
</script>

{#if connectionOptions.length == 0}
  <div>Not available</div>
{:else}
  <FormSelectField {...$$restProps} options={connectionOptions} />
{/if}
