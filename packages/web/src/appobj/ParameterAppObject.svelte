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
  title={data.pureName}
  extInfo={data.isOutputParameter ? `data.fullDataType OUT` : data.fullDataType}
  icon={'icon parameter'}
  disableHover
/>
