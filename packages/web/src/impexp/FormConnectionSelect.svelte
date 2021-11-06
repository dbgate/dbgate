<script lang="ts">
  import _ from 'lodash';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import getConnectionLabel from '../utility/getConnectionLabel';
  import { useConnectionList } from '../utility/metadataLoaders';
  export let allowChooseModel = false;

  $: connections = useConnectionList();
  $: connectionOptions = [
    ...(allowChooseModel ? [{ label: '(DB Model)', value: '__model' }] : []),
    ..._.sortBy(
      ($connections || []).map(conn => ({
        value: conn._id,
        label: getConnectionLabel(conn),
      })),
      'label'
    ),
  ];
</script>

<FormSelectField {...$$restProps} options={connectionOptions} />
