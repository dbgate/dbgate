<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import TextField from './TextField.svelte';

  export let name;

  const { values, setFieldValue } = getFormContext();
</script>

<TextField {...$$restProps} value={$values[name]} on:change={e => setFieldValue(name, e.target['checked'])} />
