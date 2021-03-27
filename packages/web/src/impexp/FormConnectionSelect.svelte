<script lang="ts">
  import _ from 'lodash';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import { useConnectionList } from '../utility/metadataLoaders';

  $: connections = useConnectionList();
  $: connectionOptions = _.sortBy(
    ($connections || []).map(conn => ({
      value: conn._id,
      label: conn.displayName || conn.server,
    })),
    'label'
  );
</script>

<FormSelectField {...$$restProps} options={connectionOptions} />
