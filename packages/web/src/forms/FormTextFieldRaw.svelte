<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import TextField from './TextField.svelte';

  export let name;
  export let defaultValue;

  const { values, setFieldValue } = getFormContext();
</script>

<TextField
  {...$$restProps}
  value={$values[name] ?? defaultValue}
  on:input={e => setFieldValue(name, e.target['value'])}
/>
