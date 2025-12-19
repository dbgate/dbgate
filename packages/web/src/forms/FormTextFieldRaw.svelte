<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import TextField from './TextField.svelte';
  import { _tval } from '../translations';

  export let name;
  export let defaultValue;
  export let saveOnInput = false;

  const { values, setFieldValue } = getFormContext();
</script>

<TextField
  {...$$restProps}
  value={$values?.[name] ? _tval($values[name]) : defaultValue}
  on:input={e => setFieldValue(name, e.target['value'])}
  on:input={e => {
    if (saveOnInput) {
      setFieldValue(name, e.target['value']);
    }
  }}
/>
