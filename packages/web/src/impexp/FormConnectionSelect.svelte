<script lang="ts">
  import _ from 'lodash';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import getConnectionLabel from '../utility/getConnectionLabel';
  import { useConnectionList } from '../utility/metadataLoaders';

  $: connections = useConnectionList();
  $: connectionOptions = _.sortBy(
    ($connections || []).map(conn => ({
      value: conn._id,
      label: getConnectionLabel(conn),
    })),
    'label'
  );
</script>

<FormSelectField {...$$restProps} options={connectionOptions} />
