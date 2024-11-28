<script lang="ts" context="module">
  export const extractKey = ({ columnName }) => columnName;
</script>

<script lang="ts">
  import AppObjectCore from './AppObjectCore.svelte';

  export let data;
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={data.parameterName}
  extInfo={data.parameterMode && data.parameterMode !== 'IN' ? `${data.dataType} ${data.parameterMode}` : data.dataType}
  icon={'icon parameter'}
  disableHover
/>
