<script lang="ts">
  import FormSelectField from '../forms/FormSelectField.svelte';

  import { useConnectionList } from '../utility/metadataLoaders';

  $: connections = useConnectionList();
  $: connectionOptions = ($connections || []).map(conn => ({
    value: conn._id,
    label: conn.displayName || conn.server,
  }));
</script>

<FormSelectField {...$$restProps} options={connectionOptions} />
