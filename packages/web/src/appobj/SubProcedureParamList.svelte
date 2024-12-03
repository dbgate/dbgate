<script lang="ts">
  import AppObjectList from './AppObjectList.svelte';
  import * as parameterAppObject from './ParameterAppObject.svelte';

  export let data;
</script>

<AppObjectList
  list={(data.parameters || []).map(parameter => ({
    ...data,
    ...parameter,
  }))}
  module={parameterAppObject}
/>
