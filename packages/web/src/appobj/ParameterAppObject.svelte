<script lang="ts" context="module">
  export const extractKey = ({ columnName }) => columnName;
</script>

<script lang="ts">
  import AppObjectCore from './AppObjectCore.svelte';

  export let data;

  function createParameterTitle(parameter) {
    if (!parameter.parameterName) return parameter.position ?? null;
    if (parameter.parameterName.startsWith('@')) return parameter.parameterName.substring(1);
    return data.parameterName;
  }

  function createParameterExtInfo(parameter) {
    if (parameter.parameterMode && parameter.parameterMode !== 'IN') {
      return `${parameter.dataType} ${parameter.parameterMode}`;
    }
    return parameter.dataType;
  }
</script>

<AppObjectCore
  {...$$restProps}
  {data}
  title={createParameterTitle(data)}
  extInfo={createParameterExtInfo(data)}
  icon={'icon parameter'}
  disableHover
/>
