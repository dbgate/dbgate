<script lang="ts">
  import _ from 'lodash';
  import FormSelectField from '../forms/FormSelectField.svelte';
  import { useConnectionList } from '../utility/metadataLoaders';
  import { getConnectionLabel } from 'dbgate-tools';

  export let allowChooseModel = false;
  export let direction;

  $: connections = useConnectionList();
  $: connectionOptions = [
    ...(allowChooseModel ? [{ label: '(DB Model)', value: '__model' }] : []),
    ..._.sortBy(
      ($connections || [])
        .filter(conn => (direction == 'target' ? !conn.isReadOnly : true))
        .map(conn => ({
          value: conn._id,
          label: getConnectionLabel(conn),
        })),
      'label'
    ),
  ];
</script>

<FormSelectField {...$$restProps} options={connectionOptions} />
