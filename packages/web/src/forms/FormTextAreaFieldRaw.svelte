<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import TextAreaField from './TextAreaField.svelte';

  export let name;
  export let defaultValue = undefined;
  export let saveOnInput = false;
  export let onChange = null;

  const { values, setFieldValue } = getFormContext();
</script>

<TextAreaField
  {...$$restProps}
  value={$values[name] ?? defaultValue}
  on:input={e => setFieldValue(name, e.target['value'])}
  on:input={e => {
    if (saveOnInput) {
      setFieldValue(name, e.target['value']);
    }
    if (onChange) {
      onChange(e.target['value']);
    }
  }}
/>
