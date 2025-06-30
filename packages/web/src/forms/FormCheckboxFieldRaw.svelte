<script lang="ts">
  import { getFormContext } from './FormProviderCore.svelte';
  import CheckboxField from './CheckboxField.svelte';

  export let name;
  export let defaultValue;

  const { values, setFieldValue } = getFormContext();
  function handleChange(e) {
    setFieldValue(name, e.target['checked']);
  }
</script>

<CheckboxField
  {...$$restProps}
  checked={$values?.[name] == 0 || $values?.[name] == 'false'
    ? false
    : $values?.[name] == '1' || $values?.[name] == 'true'
      ? true
      : ($values?.[name] ?? defaultValue)}
  on:change={handleChange}
  on:change
/>
