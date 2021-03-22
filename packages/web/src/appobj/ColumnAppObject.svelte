<script lang="ts" context="module">
  export const extractKey = ({ columnName }) => columnName;
</script>

<script lang="ts">
  import { getColumnIcon } from '../elements/ColumnLabel.svelte';

  import AppObjectCore from './AppObjectCore.svelte';

  export let data;

  $: extInfo = data.foreignKey ? `${data.dataType} -> ${data.foreignKey.refTableName}` : data.dataType;
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.columnName}
  {extInfo}
  icon={getColumnIcon(data, true)}
  disableHover
/>
